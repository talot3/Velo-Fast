-- ════════════════════════════════════════════════════════════════════
-- Regras de negócio do PDV (RPCs chamadas pelo navegador via Supabase).
-- Todas conferem permissão com private.assert_store_access e rodam numa
-- transação única: ou tudo é gravado, ou nada.
-- ════════════════════════════════════════════════════════════════════

-- Nome de usuário de quem está chamando.
create or replace function private.session_username()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select username from private.session_profile()
$$;

-- ─── Carga inicial do PDV em uma única chamada ─────────────────────
-- Produtos e subgrupos saem na ordem de cadastro, como o PDV antigo exibia
-- (o campo "Ordem" do portal nunca mudou a ordem dos botões no caixa).
create or replace function public.pdv_bootstrap(p_store_id text, p_terminal_id text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform private.assert_store_access(p_store_id, 'operador');

  select jsonb_build_object(
    'store', (select jsonb_build_object('id', s.id, 'name', s.name) from public.stores s where s.id = p_store_id),
    'settings', coalesce((select to_jsonb(ss) - 'store_id' from public.store_settings ss where ss.store_id = p_store_id), '{}'::jsonb),
    'products', coalesce((select jsonb_agg(to_jsonb(p) - 'store_id' - 'pricing' order by p.created_at, p.id) from public.products p where p.store_id = p_store_id and p.active), '[]'::jsonb),
    'groups', coalesce((select jsonb_agg(to_jsonb(g) - 'store_id' order by g.sort_order, g.created_at, g.id) from public.product_groups g where g.store_id = p_store_id), '[]'::jsonb),
    'subgroups', coalesce((select jsonb_agg(to_jsonb(sg) - 'store_id' order by sg.created_at, sg.id) from public.product_subgroups sg where sg.store_id = p_store_id), '[]'::jsonb),
    'payment_methods', coalesce((select jsonb_agg(to_jsonb(pm) - 'store_id' order by pm.sort_order, pm.created_at, pm.id) from public.payment_methods pm where pm.store_id = p_store_id and pm.active), '[]'::jsonb),
    'printers', coalesce((select jsonb_agg(to_jsonb(pr) - 'store_id' order by pr.sort_order, pr.created_at, pr.id) from public.printers pr where pr.store_id = p_store_id), '[]'::jsonb),
    'terminals', coalesce((select jsonb_agg(to_jsonb(t) - 'store_id' order by t.sort_order, t.created_at, t.id) from public.terminals t where t.store_id = p_store_id and t.active), '[]'::jsonb),
    'cash_session', (
      select to_jsonb(cs) from public.cash_sessions cs
      where cs.store_id = p_store_id and cs.terminal_id = p_terminal_id and cs.status = 'open'
      limit 1
    ),
    'server_time', now()
  ) into v_result;

  return v_result;
end;
$$;

-- ─── Registrar venda (idempotente) ──────────────────────────────────
-- p_sale: {
--   id, store_id, kind ('sale'|'refund'), terminal_id, terminal_name,
--   operator_name (só usado em estorno autorizado por supervisor),
--   cash_session_id, sold_at,
--   items: [{id, product_id, product_name, unit_price, printer_id}]   (1 por unidade)
--   payments: [{method_id, method_name, amount}]
-- }
create or replace function public.register_sale(p_sale jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store_id text := p_sale ->> 'store_id';
  v_sale_id uuid := (p_sale ->> 'id')::uuid;
  v_kind text := coalesce(p_sale ->> 'kind', 'sale');
  v_terminal text := nullif(trim(p_sale ->> 'terminal_id'), '');
  v_session_id uuid := nullif(p_sale ->> 'cash_session_id', '')::uuid;
  v_sold_at timestamptz := coalesce((p_sale ->> 'sold_at')::timestamptz, now());
  v_user uuid := (select auth.uid());
  v_username text;
  v_operator_name text;
  v_authorized_name text;
  v_inserted uuid;
  v_total numeric(12, 2);
  v_paid numeric(12, 2);
  v_items jsonb := coalesce(p_sale -> 'items', '[]'::jsonb);
  v_payments jsonb := coalesce(p_sale -> 'payments', '[]'::jsonb);
  v_lines jsonb;
  v_mismatch jsonb;
begin
  if v_sale_id is null or v_store_id is null then
    raise exception 'Venda sem id ou loja.' using errcode = '22023';
  end if;
  if v_kind not in ('sale', 'refund') then
    raise exception 'Tipo de venda inválido.' using errcode = '22023';
  end if;
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    raise exception 'Venda sem itens.' using errcode = '22023';
  end if;
  if jsonb_array_length(v_items) > 500 then
    raise exception 'Venda com itens demais.' using errcode = '22023';
  end if;
  if jsonb_typeof(v_payments) <> 'array' then
    raise exception 'Pagamentos inválidos.' using errcode = '22023';
  end if;

  -- Estorno em dinheiro exige supervisor (sessão elevada no PDV).
  perform private.assert_store_access(v_store_id, case when v_kind = 'refund' then 'supervisor' else 'operador' end);

  -- Já registrada? (reenvio da fila offline) → devolve o que existe.
  if exists (select 1 from public.sales where id = v_sale_id) then
    if not exists (select 1 from public.sales where id = v_sale_id and store_id = v_store_id) then
      raise exception 'Venda pertence a outra loja.' using errcode = '42501';
    end if;
    return jsonb_build_object('sale_id', v_sale_id, 'status', 'duplicate');
  end if;

  v_username := private.session_username();
  if v_kind = 'refund' then
    v_operator_name := coalesce(nullif(trim(p_sale ->> 'operator_name'), ''), v_username);
    v_authorized_name := v_username;
  else
    v_operator_name := v_username;
  end if;

  -- Itens normalizados, com preço oficial do catálogo quando o produto existe.
  select jsonb_agg(jsonb_build_object(
           'line_no', i.ord,
           'id', i.item ->> 'id',
           'product_id', nullif(i.item ->> 'product_id', ''),
           'product_name', coalesce(p.name, nullif(trim(i.item ->> 'product_name'), ''), 'PRODUTO'),
           'client_price', (i.item ->> 'unit_price')::numeric(12, 2),
           'unit_price', case
              when p.id is null then (i.item ->> 'unit_price')::numeric(12, 2)
              when (i.item ->> 'unit_price')::numeric < 0 then -abs(p.price)
              else abs(p.price)
            end,
           'printer_id', coalesce(p.printer_id, nullif(i.item ->> 'printer_id', '')),
           'catalog_found', p.id is not null
         ) order by i.ord)
    into v_lines
  from jsonb_array_elements(v_items) with ordinality as i(item, ord)
  left join public.products p
    on p.store_id = v_store_id and p.id = nullif(i.item ->> 'product_id', '');

  if exists (
    select 1 from jsonb_to_recordset(v_lines) as l(id uuid, client_price numeric)
    where l.id is null or l.client_price is null
  ) then
    raise exception 'Item de venda inválido.' using errcode = '22023';
  end if;

  select coalesce(sum(l.unit_price), 0),
         jsonb_agg(jsonb_build_object('line', l.line_no, 'client', l.client_price, 'catalog', l.unit_price))
           filter (where l.catalog_found and l.client_price <> l.unit_price)
    into v_total, v_mismatch
  from jsonb_to_recordset(v_lines) as l(line_no integer, client_price numeric(12, 2), unit_price numeric(12, 2), catalog_found boolean);

  if v_kind = 'refund' and exists (
    select 1 from jsonb_to_recordset(v_lines) as l(unit_price numeric) where l.unit_price >= 0
  ) then
    raise exception 'Estorno só pode ter itens negativos.' using errcode = '22023';
  end if;

  select coalesce(sum((pay ->> 'amount')::numeric(12, 2)), 0) into v_paid
  from jsonb_array_elements(v_payments) pay;

  if v_kind = 'sale' then
    if v_total < 0 then
      raise exception 'Venda com saldo negativo: use o estorno.' using errcode = '22023';
    end if;
    if v_paid + 0.005 < v_total then
      raise exception 'Pagamento insuficiente para a venda.' using errcode = '22023';
    end if;
    if v_paid - v_total > 0.005 and not exists (
      select 1 from jsonb_array_elements(v_payments) pay
      where upper(pay ->> 'method_name') like '%DINHEIRO%' or upper(pay ->> 'method_name') like '%CASH%'
    ) then
      raise exception 'Troco só é permitido em pagamento em dinheiro.' using errcode = '22023';
    end if;
  end if;

  -- Sessão de caixa: a informada, ou a aberta deste terminal.
  if v_session_id is not null and not exists (
    select 1 from public.cash_sessions where id = v_session_id and store_id = v_store_id
  ) then
    v_session_id := null;
  end if;
  if v_session_id is null and v_terminal is not null then
    select id into v_session_id from public.cash_sessions
     where store_id = v_store_id and terminal_id = v_terminal and status = 'open';
  end if;

  insert into public.sales (
    id, store_id, kind, terminal_id, terminal_name, operator_id, operator_name,
    authorized_by, authorized_by_name, cash_session_id, total, paid_total, change_total,
    payment_label, sold_at, meta
  ) values (
    v_sale_id, v_store_id, v_kind, v_terminal, nullif(trim(p_sale ->> 'terminal_name'), ''),
    case when v_kind = 'refund' then null else v_user end, v_operator_name,
    case when v_kind = 'refund' then v_user else null end, v_authorized_name,
    v_session_id, v_total, case when v_kind = 'refund' then v_total else v_paid end,
    case when v_kind = 'sale' then greatest(v_paid - v_total, 0) else 0 end,
    case
      when v_kind = 'refund' then 'ESTORNO DINHEIRO'
      else coalesce((select string_agg(pay ->> 'method_name', ' + ' order by ord) from jsonb_array_elements(v_payments) with ordinality as x(pay, ord)), '')
    end,
    v_sold_at,
    case when v_mismatch is null then '{}'::jsonb else jsonb_build_object('price_mismatch', v_mismatch) end
  )
  on conflict (id) do nothing
  returning id into v_inserted;

  if v_inserted is null then
    return jsonb_build_object('sale_id', v_sale_id, 'status', 'duplicate');
  end if;

  insert into public.sale_items (id, sale_id, store_id, line_no, product_id, product_name, unit_price, printer_id)
  select l.id, v_sale_id, v_store_id, l.line_no, l.product_id, l.product_name, l.unit_price, l.printer_id
  from jsonb_to_recordset(v_lines) as l(id uuid, line_no integer, product_id text, product_name text, unit_price numeric(12, 2), printer_id text);

  if v_kind = 'refund' then
    insert into public.sale_payments (sale_id, store_id, line_no, method_id, method_name, amount)
    values (v_sale_id, v_store_id, 1, null, 'DINHEIRO', v_total);
  else
    insert into public.sale_payments (sale_id, store_id, line_no, method_id, method_name, amount)
    select v_sale_id, v_store_id, ord::integer, nullif(pay ->> 'method_id', ''),
           coalesce(nullif(trim(pay ->> 'method_name'), ''), 'N/D'), (pay ->> 'amount')::numeric(12, 2)
    from jsonb_array_elements(v_payments) with ordinality as x(pay, ord);
  end if;

  -- Estoque: venda baixa 1 por ficha; crédito/estorno devolve 1.
  update public.products p
     set stock = p.stock - x.qty
    from (
      select l.product_id, sum(case when l.unit_price >= 0 then 1 else -1 end) as qty
      from jsonb_to_recordset(v_lines) as l(product_id text, unit_price numeric)
      where l.product_id is not null
      group by l.product_id
    ) x
   where p.store_id = v_store_id and p.id = x.product_id and p.stock is not null;

  return jsonb_build_object(
    'sale_id', v_sale_id,
    'status', 'created',
    'total', v_total,
    'paid_total', v_paid,
    'cash_session_id', v_session_id,
    'price_mismatch', v_mismatch,
    'items', (
      select jsonb_agg(jsonb_build_object('id', l.id, 'line_no', l.line_no, 'product_id', l.product_id,
                                          'product_name', l.product_name, 'unit_price', l.unit_price) order by l.line_no)
      from jsonb_to_recordset(v_lines) as l(id uuid, line_no integer, product_id text, product_name text, unit_price numeric(12, 2))
    )
  );
end;
$$;

-- ─── Cancelar fichas (supervisor) ───────────────────────────────────
create or replace function public.cancel_sale_items(p_store_id text, p_item_ids uuid[], p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform private.assert_store_access(p_store_id, 'supervisor');

  with cancelled as (
    update public.sale_items si
       set status = 'cancelled',
           cancelled_at = now(),
           cancelled_by = (select auth.uid()),
           cancelled_by_name = private.session_username(),
           cancel_reason = nullif(trim(p_reason), '')
     where si.store_id = p_store_id
       and si.id = any (p_item_ids)
       and si.status = 'active'
    returning si.product_id, si.unit_price
  ), stock as (
    update public.products p
       set stock = p.stock + x.qty
      from (
        select product_id, sum(case when unit_price >= 0 then 1 else -1 end) as qty
        from cancelled where product_id is not null group by product_id
      ) x
     where p.store_id = p_store_id and p.id = x.product_id and p.stock is not null
    returning 1
  )
  select count(*) into v_count from cancelled;

  if v_count = 0 then
    raise exception 'Venda não encontrada ou já cancelada.' using errcode = 'P0002';
  end if;

  return jsonb_build_object('cancelled', v_count);
end;
$$;

-- ─── Caixa ──────────────────────────────────────────────────────────
-- Abre o caixa do terminal. Se já houver um aberto, devolve esse (o
-- próximo operador herda o caixa, como no sistema antigo).
create or replace function public.open_cash_session(
  p_store_id text,
  p_session_id uuid,
  p_terminal_id text,
  p_opening_amount numeric,
  p_opened_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.cash_sessions;
begin
  perform private.assert_store_access(p_store_id, 'operador');
  if nullif(trim(p_terminal_id), '') is null then
    raise exception 'Terminal não informado.' using errcode = '22023';
  end if;

  select * into v_session from public.cash_sessions
   where store_id = p_store_id and terminal_id = p_terminal_id and status = 'open';
  if found then
    return jsonb_build_object('session', to_jsonb(v_session), 'status', 'already_open');
  end if;

  select * into v_session from public.cash_sessions where id = p_session_id;
  if found then
    return jsonb_build_object('session', to_jsonb(v_session), 'status', 'duplicate');
  end if;

  insert into public.cash_sessions (id, store_id, terminal_id, operator_id, operator_name, opened_at, opening_amount)
  values (p_session_id, p_store_id, p_terminal_id, (select auth.uid()), private.session_username(),
          coalesce(p_opened_at, now()), greatest(coalesce(p_opening_amount, 0), 0))
  returning * into v_session;

  return jsonb_build_object('session', to_jsonb(v_session), 'status', 'created');
end;
$$;

-- Resumo do caixa (prévia do fechamento e relatório do portal).
create or replace function public.cash_session_summary(p_store_id text, p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_session public.cash_sessions;
  v_result jsonb;
begin
  perform private.assert_store_access(p_store_id, 'operador');
  select * into v_session from public.cash_sessions where id = p_session_id and store_id = p_store_id;
  if not found then
    raise exception 'Caixa não encontrado.' using errcode = 'P0002';
  end if;

  with sale_active as (
    select s.id, s.kind, s.payment_label, s.paid_total, s.change_total,
           coalesce(sum(si.unit_price) filter (where si.status = 'active'), 0) as active_total,
           count(si.id) filter (where si.status = 'active') as active_units,
           s.total
    from public.sales s
    join public.sale_items si on si.sale_id = s.id
    where s.cash_session_id = p_session_id
    group by s.id
  ),
  -- Distribui o valor ativo da venda entre as formas de pagamento, na
  -- proporção paga. O troco sai das formas "dinheiro" (proporcionalmente).
  pay_by_method as (
    select sp.sale_id, sp.method_name, sum(sp.amount) as amount,
           (upper(sp.method_name) like '%DINHEIRO%' or upper(sp.method_name) like '%CASH%') as is_cash
    from public.sale_payments sp
    where sp.sale_id in (select id from sale_active)
    group by sp.sale_id, sp.method_name
  ),
  pay_net as (
    select pm.sale_id, pm.method_name, pm.is_cash,
           pm.amount - case
             when pm.is_cash and sa.kind = 'sale' then
               sa.change_total * pm.amount / nullif(sum(pm.amount) filter (where pm.is_cash) over (partition by pm.sale_id), 0)
             else 0
           end as net_amount
    from pay_by_method pm
    join sale_active sa on sa.id = pm.sale_id
  ),
  pay_alloc as (
    select pn.method_name,
           case
             when sa.kind = 'refund' then sa.active_total
             else sa.active_total * pn.net_amount / nullif(sum(pn.net_amount) over (partition by pn.sale_id), 0)
           end as amount
    from pay_net pn
    join sale_active sa on sa.id = pn.sale_id
  ),
  by_method as (
    select method_name, round(coalesce(sum(amount), 0), 2) as total
    from pay_alloc group by method_name
  ),
  by_label as (
    select payment_label, round(sum(active_total), 2) as total, sum(active_units) as qty
    from sale_active group by payment_label
  ),
  movements as (
    select coalesce(jsonb_agg(to_jsonb(m) order by m.occurred_at), '[]'::jsonb) as list,
           coalesce(sum(m.amount) filter (where m.kind = 'sangria'), 0) as sangrias,
           coalesce(sum(m.amount) filter (where m.kind = 'suprimento'), 0) as suprimentos
    from public.cash_movements m where m.session_id = p_session_id
  )
  select jsonb_build_object(
    'session', to_jsonb(v_session),
    'total_vendas', (select coalesce(round(sum(active_total), 2), 0) from sale_active),
    'qtd_transacoes', (select coalesce(sum(active_units), 0) from sale_active),
    'by_method', (select coalesce(jsonb_agg(jsonb_build_object('method', method_name, 'total', total) order by method_name), '[]'::jsonb) from by_method),
    'by_label', (select coalesce(jsonb_agg(jsonb_build_object('label', payment_label, 'total', total, 'qty', qty) order by payment_label), '[]'::jsonb) from by_label),
    'movements', (select list from movements),
    'total_sangrias', (select sangrias from movements),
    'total_suprimentos', (select suprimentos from movements),
    'dinheiro_em_caixa', v_session.opening_amount
        + coalesce((select sum(total) from by_method where upper(method_name) like '%DINHEIRO%' or upper(method_name) like '%CASH%'), 0)
        + (select suprimentos from movements)
        - (select sangrias from movements)
  ) into v_result;

  return v_result;
end;
$$;

-- Sangria ou suprimento (idempotente pelo id).
create or replace function public.add_cash_movement(p_store_id text, p_movement jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := (p_movement ->> 'id')::uuid;
  v_terminal text := nullif(trim(p_movement ->> 'terminal_id'), '');
  v_session uuid;
  v_row public.cash_movements;
begin
  perform private.assert_store_access(p_store_id, 'operador');
  if v_id is null or v_terminal is null then
    raise exception 'Movimento sem id ou terminal.' using errcode = '22023';
  end if;
  if coalesce((p_movement ->> 'amount')::numeric, 0) <= 0 then
    raise exception 'Informe um valor maior que zero.' using errcode = '22023';
  end if;

  select * into v_row from public.cash_movements where id = v_id;
  if found then
    return jsonb_build_object('movement', to_jsonb(v_row), 'status', 'duplicate');
  end if;

  select id into v_session from public.cash_sessions
   where store_id = p_store_id and terminal_id = v_terminal and status = 'open';

  insert into public.cash_movements (id, store_id, session_id, terminal_id, kind, amount, reason, operator_id, operator_name, occurred_at)
  values (
    v_id, p_store_id, v_session, v_terminal,
    coalesce(p_movement ->> 'kind', 'sangria'),
    (p_movement ->> 'amount')::numeric(12, 2),
    nullif(trim(p_movement ->> 'reason'), ''),
    (select auth.uid()), private.session_username(),
    coalesce((p_movement ->> 'occurred_at')::timestamptz, now())
  )
  returning * into v_row;

  return jsonb_build_object('movement', to_jsonb(v_row), 'status', 'created');
end;
$$;

-- Fecha o caixa gravando o resumo calculado no servidor.
create or replace function public.close_cash_session(p_store_id text, p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_summary jsonb;
begin
  perform private.assert_store_access(p_store_id, 'operador');
  v_summary := public.cash_session_summary(p_store_id, p_session_id);

  update public.cash_sessions
     set status = 'closed',
         closed_at = now(),
         closed_by = (select auth.uid()),
         closed_by_name = private.session_username(),
         closing = v_summary - 'session'
   where id = p_session_id and store_id = p_store_id and status = 'open';

  if not found then
    return jsonb_build_object('status', 'already_closed', 'summary', v_summary);
  end if;
  return jsonb_build_object('status', 'closed', 'summary', v_summary);
end;
$$;

-- ─── Impressão ──────────────────────────────────────────────────────
create or replace function private.printer_snapshot(p_store_id text, p_printer_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(p) - 'store_id' - 'created_at' - 'updated_at' - 'sort_order'
  from public.printers p
  where p.store_id = p_store_id and p.id = p_printer_id
$$;

-- Impressora do terminal; se não houver, a primeira cadastrada (regra antiga
-- para sangria/fechamento).
create or replace function private.receipt_printer(p_store_id text, p_terminal_id text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select t.printer_id from public.terminals t
      join public.printers p on p.store_id = t.store_id and p.id = t.printer_id
      where t.store_id = p_store_id and t.id = p_terminal_id),
    (select p.id from public.printers p where p.store_id = p_store_id order by p.sort_order, p.created_at limit 1)
  )
$$;

-- Enfileira as fichas das unidades informadas. Regra de impressora (igual
-- ao PDV antigo): a do terminal; senão a do produto; senão não imprime.
create or replace function public.print_sale_items(p_store_id text, p_item_ids uuid[], p_reprint boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket jsonb;
  v_lines jsonb;
  v_jobs integer := 0;
  v_printers text[] := '{}'::text[];
  v_unprinted jsonb;
  r record;
begin
  perform private.assert_store_access(p_store_id, 'operador');

  select coalesce(ticket_config, '{}'::jsonb) into v_ticket from public.store_settings where store_id = p_store_id;

  select jsonb_agg(jsonb_build_object(
           'item_id', si.id,
           'printer_id', coalesce(tp.id, ip.id),
           'line_no', si.line_no,
           'product_name', si.product_name,
           'unit_price', si.unit_price,
           'payment_label', s.payment_label,
           'terminal_id', s.terminal_id,
           'operator', s.operator_name,
           'sold_at', s.sold_at,
           'refund', si.unit_price < 0
         ))
    into v_lines
  from public.sale_items si
  join public.sales s on s.id = si.sale_id
  left join public.terminals t on t.store_id = s.store_id and t.id = s.terminal_id
  left join public.printers tp on tp.store_id = s.store_id and tp.id = t.printer_id
  left join public.printers ip on ip.store_id = si.store_id and ip.id = si.printer_id
  where si.store_id = p_store_id
    and si.id = any (p_item_ids)
    and si.status = 'active';

  if v_lines is null then
    raise exception 'Nenhuma ficha ativa para imprimir.' using errcode = 'P0002';
  end if;

  for r in
    select l.printer_id,
           jsonb_agg(l.line - 'printer_id' order by l.line ->> 'sold_at', (l.line ->> 'line_no')::integer) as fichas
    from (
      select x.value ->> 'printer_id' as printer_id, x.value as line
      from jsonb_array_elements(v_lines) x
    ) l
    where l.printer_id is not null
    group by l.printer_id
  loop
    insert into public.print_jobs (store_id, printer_id, kind, data, created_by)
    values (
      p_store_id, r.printer_id, 'ficha',
      jsonb_build_object(
        'printer', private.printer_snapshot(p_store_id, r.printer_id),
        'ticket', v_ticket,
        'reprint', p_reprint,
        'fichas', r.fichas
      ),
      (select auth.uid())
    );
    v_jobs := v_jobs + 1;
    v_printers := v_printers || (select name from public.printers where store_id = p_store_id and id = r.printer_id);
  end loop;

  update public.sale_items si
     set print_count = print_count + 1, last_printed_at = now()
   where si.store_id = p_store_id
     and si.id in (
       select (x.value ->> 'item_id')::uuid from jsonb_array_elements(v_lines) x
       where x.value ->> 'printer_id' is not null
     );

  select coalesce(jsonb_agg(x.value ->> 'item_id'), '[]'::jsonb) into v_unprinted
  from jsonb_array_elements(v_lines) x
  where x.value ->> 'printer_id' is null;

  return jsonb_build_object('jobs', v_jobs, 'printers', to_jsonb(v_printers), 'unprinted', v_unprinted);
end;
$$;

-- Comprovante de sangria.
create or replace function public.print_cash_movement(p_store_id text, p_movement_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mov public.cash_movements;
  v_printer text;
begin
  perform private.assert_store_access(p_store_id, 'operador');
  select * into v_mov from public.cash_movements where id = p_movement_id and store_id = p_store_id;
  if not found then
    raise exception 'Movimento não encontrado.' using errcode = 'P0002';
  end if;
  v_printer := private.receipt_printer(p_store_id, v_mov.terminal_id);
  if v_printer is null then
    raise exception 'Nenhuma impressora disponível. Configure no portal.' using errcode = 'P0002';
  end if;
  insert into public.print_jobs (store_id, printer_id, kind, data, created_by)
  values (p_store_id, v_printer, 'sangria', jsonb_build_object(
    'printer', private.printer_snapshot(p_store_id, v_printer),
    'movement', to_jsonb(v_mov)
  ), (select auth.uid()));
  return jsonb_build_object('queued', true, 'printer_name', (select name from public.printers where store_id = p_store_id and id = v_printer));
end;
$$;

-- Relatório de fechamento.
create or replace function public.print_cash_closing(p_store_id text, p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.cash_sessions;
  v_printer text;
  v_summary jsonb;
begin
  perform private.assert_store_access(p_store_id, 'operador');
  select * into v_session from public.cash_sessions where id = p_session_id and store_id = p_store_id;
  if not found then
    raise exception 'Caixa não encontrado.' using errcode = 'P0002';
  end if;
  v_printer := private.receipt_printer(p_store_id, v_session.terminal_id);
  if v_printer is null then
    raise exception 'Nenhuma impressora disponível. Configure no portal.' using errcode = 'P0002';
  end if;
  v_summary := coalesce(v_session.closing, public.cash_session_summary(p_store_id, p_session_id) - 'session');
  insert into public.print_jobs (store_id, printer_id, kind, data, created_by)
  values (p_store_id, v_printer, 'fechamento', jsonb_build_object(
    'printer', private.printer_snapshot(p_store_id, v_printer),
    'session', to_jsonb(v_session),
    'summary', v_summary
  ), (select auth.uid()));
  return jsonb_build_object('queued', true, 'printer_name', (select name from public.printers where store_id = p_store_id and id = v_printer));
end;
$$;

-- Teste de impressora (portal, supervisor).
create or replace function public.print_test(p_store_id text, p_printer_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket jsonb;
begin
  perform private.assert_store_access(p_store_id, 'supervisor');
  if not exists (select 1 from public.printers where store_id = p_store_id and id = p_printer_id) then
    raise exception 'Impressora não encontrada.' using errcode = 'P0002';
  end if;
  select coalesce(ticket_config, '{}'::jsonb) into v_ticket from public.store_settings where store_id = p_store_id;
  insert into public.print_jobs (store_id, printer_id, kind, data, created_by)
  values (p_store_id, p_printer_id, 'teste', jsonb_build_object(
    'printer', private.printer_snapshot(p_store_id, p_printer_id),
    'ticket', v_ticket,
    'fichas', jsonb_build_array(jsonb_build_object(
      'line_no', 1, 'product_name', '*** TESTE DE IMPRESSORA ***', 'payment_label', 'TESTE',
      'terminal_id', 'PORTAL', 'operator', 'ADMIN', 'sold_at', now(), 'refund', false
    ))
  ), (select auth.uid()));
  return jsonb_build_object('queued', true, 'printer_name', (select name from public.printers where store_id = p_store_id and id = p_printer_id));
end;
$$;

-- ─── Ponte local (chamada com a chave publishable + chave da ponte) ─
create or replace function private.bridge_from_key(p_key text)
returns public.printer_bridges
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bridge public.printer_bridges;
begin
  select * into v_bridge from public.printer_bridges
   where key_prefix = left(p_key, 16)
     and active
     and key_hash = encode(extensions.digest(p_key, 'sha256'), 'hex');
  if not found then
    raise exception 'Chave de ponte inválida.' using errcode = '28000';
  end if;
  update public.printer_bridges set last_seen_at = now() where id = v_bridge.id;
  return v_bridge;
end;
$$;

create or replace function public.bridge_claim_jobs(p_key text, p_limit integer default 20)
returns table (id bigint, kind text, data jsonb, created_at timestamptz, attempts integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bridge public.printer_bridges := private.bridge_from_key(p_key);
begin
  -- Trabalho preso em "printing" por mais de 2 min: tenta de novo até 3 vezes.
  update public.print_jobs j
     set status = 'failed', error = coalesce(j.error, 'Sem confirmação da ponte.')
   where j.store_id = v_bridge.store_id and j.status = 'printing'
     and j.claimed_at < now() - interval '2 minutes' and j.attempts >= 3;

  return query
  with next_jobs as (
    select pj.id
    from public.print_jobs pj
    where pj.store_id = v_bridge.store_id
      and (pj.status = 'pending' or (pj.status = 'printing' and pj.claimed_at < now() - interval '2 minutes'))
    order by pj.created_at
    limit least(greatest(coalesce(p_limit, 20), 1), 50)
    for update skip locked
  )
  update public.print_jobs pj
     set status = 'printing', claimed_at = now(), attempts = pj.attempts + 1
    from next_jobs n
   where pj.id = n.id
  returning pj.id, pj.kind, pj.data, pj.created_at, pj.attempts;
end;
$$;

create or replace function public.bridge_ack_job(p_key text, p_job_id bigint, p_ok boolean, p_error text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bridge public.printer_bridges := private.bridge_from_key(p_key);
begin
  update public.print_jobs
     set status = case when p_ok then 'done' else 'failed' end,
         printed_at = case when p_ok then now() else null end,
         error = case when p_ok then null else left(coalesce(p_error, 'Falha na impressão.'), 500) end
   where id = p_job_id and store_id = v_bridge.store_id and status = 'printing';
end;
$$;

-- Gera a chave da ponte (mostrada uma única vez). Admin da loja ou master.
create or replace function public.create_printer_bridge(p_store_id text, p_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text := 'vfb_' || encode(extensions.gen_random_bytes(24), 'hex');
  v_id uuid;
begin
  perform private.assert_store_access(p_store_id, 'admin');
  insert into public.printer_bridges (store_id, name, key_prefix, key_hash)
  values (p_store_id, coalesce(nullif(trim(p_name), ''), 'Ponte ' || p_store_id), left(v_key, 16),
          encode(extensions.digest(v_key, 'sha256'), 'hex'))
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'api_key', v_key, 'store_id', p_store_id);
end;
$$;

-- Últimas fichas do terminal (listas de reimpressão e cancelamento do PDV).
-- Antes vinham do histórico de impressão salvo no navegador (50 itens).
create or replace function public.pdv_recent_items(p_store_id text, p_terminal_id text, p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_store_access(p_store_id, 'operador');
  return coalesce((
    select jsonb_agg(x order by x.sold_at desc, x.line_no desc)
    from (
      select si.id, si.sale_id, si.line_no, si.product_id, si.product_name, si.unit_price, si.status,
             si.print_count, si.printer_id, s.payment_label, s.operator_name, s.terminal_id, s.sold_at, s.kind
      from public.sale_items si
      join public.sales s on s.id = si.sale_id
      where si.store_id = p_store_id
        and s.terminal_id = p_terminal_id
      order by s.sold_at desc, si.line_no desc
      limit least(greatest(coalesce(p_limit, 50), 1), 200)
    ) x
  ), '[]'::jsonb);
end;
$$;

-- ─── Permissões de execução ─────────────────────────────────────────
revoke all on function
  public.pdv_recent_items(text, text, integer),
  public.pdv_bootstrap(text, text),
  public.register_sale(jsonb),
  public.cancel_sale_items(text, uuid[], text),
  public.open_cash_session(text, uuid, text, numeric, timestamptz),
  public.cash_session_summary(text, uuid),
  public.add_cash_movement(text, jsonb),
  public.close_cash_session(text, uuid),
  public.print_sale_items(text, uuid[], boolean),
  public.print_cash_movement(text, uuid),
  public.print_cash_closing(text, uuid),
  public.print_test(text, text),
  public.bridge_claim_jobs(text, integer),
  public.bridge_ack_job(text, bigint, boolean, text),
  public.create_printer_bridge(text, text)
from public, anon;

grant execute on function
  public.pdv_recent_items(text, text, integer),
  public.pdv_bootstrap(text, text),
  public.register_sale(jsonb),
  public.cancel_sale_items(text, uuid[], text),
  public.open_cash_session(text, uuid, text, numeric, timestamptz),
  public.cash_session_summary(text, uuid),
  public.add_cash_movement(text, jsonb),
  public.close_cash_session(text, uuid),
  public.print_sale_items(text, uuid[], boolean),
  public.print_cash_movement(text, uuid),
  public.print_cash_closing(text, uuid),
  public.print_test(text, text),
  public.create_printer_bridge(text, text)
to authenticated;

-- A ponte usa a chave publishable (papel anon) + a própria chave.
grant execute on function public.bridge_claim_jobs(text, integer), public.bridge_ack_job(text, bigint, boolean, text) to anon;

revoke all on function private.session_username(), private.printer_snapshot(text, text), private.receipt_printer(text, text), private.bridge_from_key(text) from public, anon, authenticated;
grant execute on function private.session_username(), private.printer_snapshot(text, text), private.receipt_printer(text, text) to authenticated;
