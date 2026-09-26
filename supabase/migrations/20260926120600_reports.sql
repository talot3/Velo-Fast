-- ════════════════════════════════════════════════════════════════════
-- Relatórios calculados no banco (rápidos, por período, sem baixar o
-- histórico inteiro no navegador). Datas são dias locais de São Paulo.
--
-- Correções em relação ao sistema antigo:
--   * pagamento combinado é repartido pelo valor pago de cada forma (não
--     meio a meio) e o troco sai do dinheiro;
--   * estorno em dinheiro conta como dinheiro;
--   * estorno/crédito reduz a quantidade vendida (antes somava +1);
--   * fichas canceladas ficam fora do faturamento.
-- ════════════════════════════════════════════════════════════════════

create or replace function private.br_start(p_day date)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select (p_day::timestamp at time zone 'America/Sao_Paulo')
$$;

-- Quanto de cada venda (itens ativos) coube a cada forma de pagamento.
create or replace function private.sale_allocations(
  p_store_id text,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_session_id uuid default null
)
returns table (
  sale_id uuid,
  kind text,
  terminal_id text,
  terminal_name text,
  payment_label text,
  sold_at timestamptz,
  method_name text,
  is_cash boolean,
  amount numeric,
  active_total numeric,
  active_units bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with sale_active as (
    select s.id, s.kind, s.terminal_id, s.terminal_name, s.payment_label, s.sold_at, s.change_total,
           coalesce(sum(si.unit_price) filter (where si.status = 'active'), 0) as active_total,
           count(si.id) filter (where si.status = 'active') as active_units
    from public.sales s
    join public.sale_items si on si.sale_id = s.id
    where s.store_id = p_store_id
      and (p_session_id is null or s.cash_session_id = p_session_id)
      and (p_from is null or s.sold_at >= p_from)
      and (p_to is null or s.sold_at < p_to)
    group by s.id
  ),
  pay_by_method as (
    select sp.sale_id, sp.method_name, sum(sp.amount) as amount,
           (upper(sp.method_name) like '%DINHEIRO%' or upper(sp.method_name) like '%CASH%') as is_cash
    from public.sale_payments sp
    join sale_active sa on sa.id = sp.sale_id
    group by sp.sale_id, sp.method_name
  ),
  pay_net as (
    select pm.sale_id, pm.method_name, pm.is_cash,
           pm.amount - case
             when pm.is_cash and sa.kind = 'sale' then
               sa.change_total * pm.amount
                 / nullif(sum(pm.amount) filter (where pm.is_cash) over (partition by pm.sale_id), 0)
             else 0
           end as net_amount
    from pay_by_method pm
    join sale_active sa on sa.id = pm.sale_id
  )
  select sa.id, sa.kind, sa.terminal_id, sa.terminal_name, sa.payment_label, sa.sold_at,
         pn.method_name, pn.is_cash,
         case
           when sa.kind = 'refund' then sa.active_total
           else coalesce(sa.active_total * pn.net_amount / nullif(sum(pn.net_amount) over (partition by pn.sale_id), 0), 0)
         end,
         sa.active_total, sa.active_units
  from sale_active sa
  join pay_net pn on pn.sale_id = sa.id
$$;

-- Resumo do caixa reescrito sobre a mesma regra de rateio.
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
    select s.id, s.payment_label,
           coalesce(sum(si.unit_price) filter (where si.status = 'active'), 0) as active_total,
           count(si.id) filter (where si.status = 'active') as active_units
    from public.sales s
    join public.sale_items si on si.sale_id = s.id
    where s.store_id = p_store_id and s.cash_session_id = p_session_id
    group by s.id
  ),
  alloc as (
    select * from private.sale_allocations(p_store_id, null, null, p_session_id)
  ),
  by_method as (
    select method_name, bool_or(is_cash) as is_cash, round(coalesce(sum(amount), 0), 2) as total
    from alloc group by method_name
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
    'by_method', (select coalesce(jsonb_agg(jsonb_build_object('method', method_name, 'total', total, 'is_cash', is_cash) order by method_name), '[]'::jsonb) from by_method),
    'by_label', (select coalesce(jsonb_agg(jsonb_build_object('label', payment_label, 'total', total, 'qty', qty) order by payment_label), '[]'::jsonb) from by_label),
    'movements', (select list from movements),
    'total_sangrias', (select sangrias from movements),
    'total_suprimentos', (select suprimentos from movements),
    'dinheiro_vendas', coalesce((select sum(total) from by_method where is_cash), 0),
    'dinheiro_em_caixa', v_session.opening_amount
        + coalesce((select sum(total) from by_method where is_cash), 0)
        + (select suprimentos from movements)
        - (select sangrias from movements)
  ) into v_result;

  return v_result;
end;
$$;

-- ─── Vendas por produto (também usado por "Vendas por Período") ─────
create or replace function public.report_sales_by_product(p_store_id text, p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_from timestamptz := private.br_start(p_from);
  v_to timestamptz := private.br_start(p_to + 1);
begin
  perform private.assert_store_access(p_store_id, 'supervisor');
  return (
    with items as (
      select si.product_id, si.product_name, si.unit_price, s.payment_label
      from public.sale_items si
      join public.sales s on s.id = si.sale_id
      where si.store_id = p_store_id and si.status = 'active'
        and s.sold_at >= v_from and s.sold_at < v_to
    ),
    per_product as (
      select product_name, max(product_id) as product_id,
             sum(case when unit_price >= 0 then 1 else -1 end) as qty,
             sum(unit_price) as total
      from items group by product_name
    ),
    per_product_label as (
      select product_name, payment_label, count(*) as n
      from items where unit_price >= 0
      group by product_name, payment_label
    )
    select jsonb_build_object(
      'total', coalesce((select sum(unit_price) from items), 0),
      'units', coalesce((select sum(case when unit_price >= 0 then 1 else -1 end) from items), 0),
      'records', (select count(*) from items),
      'distinct_products', (select count(*) from per_product),
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'product_id', pp.product_id,
                 'product_name', pp.product_name,
                 'qty', pp.qty,
                 'total', pp.total,
                 'methods', coalesce((select jsonb_object_agg(pl.payment_label, pl.n) from per_product_label pl where pl.product_name = pp.product_name), '{}'::jsonb)
               ) order by pp.total desc, pp.product_name)
        from per_product pp
      ), '[]'::jsonb)
    )
  );
end;
$$;

-- ─── Vendas por caixa ───────────────────────────────────────────────
create or replace function public.report_sales_by_terminal(p_store_id text, p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_from timestamptz := private.br_start(p_from);
  v_to timestamptz := private.br_start(p_to + 1);
begin
  perform private.assert_store_access(p_store_id, 'supervisor');
  return (
    with items as (
      select coalesce(s.terminal_id, 'Desconhecido') as terminal_id,
             max(s.terminal_name) over (partition by s.terminal_id) as terminal_name,
             si.unit_price, s.payment_label
      from public.sale_items si
      join public.sales s on s.id = si.sale_id
      where si.store_id = p_store_id and si.status = 'active'
        and s.sold_at >= v_from and s.sold_at < v_to
    ),
    per_terminal as (
      select terminal_id, max(terminal_name) as terminal_name,
             count(*) filter (where unit_price >= 0) as units,
             sum(unit_price) as total
      from items group by terminal_id
    ),
    per_terminal_label as (
      select terminal_id, payment_label, count(*) as n
      from items where unit_price >= 0 group by terminal_id, payment_label
    )
    select jsonb_build_object(
      'total', coalesce((select sum(unit_price) from items), 0),
      'tickets', (select count(*) from items where unit_price >= 0),
      'terminals', (select count(*) from per_terminal),
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'terminal_id', pt.terminal_id,
                 'terminal_name', pt.terminal_name,
                 'units', pt.units,
                 'total', pt.total,
                 'methods', coalesce((select jsonb_object_agg(pl.payment_label, pl.n) from per_terminal_label pl where pl.terminal_id = pt.terminal_id), '{}'::jsonb)
               ) order by pt.total desc, pt.terminal_id)
        from per_terminal pt
      ), '[]'::jsonb)
    )
  );
end;
$$;

-- ─── Fechamento por caixa no período ───────────────────────────────
create or replace function public.report_cash_closing(p_store_id text, p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_from timestamptz := private.br_start(p_from);
  v_to timestamptz := private.br_start(p_to + 1);
begin
  perform private.assert_store_access(p_store_id, 'supervisor');
  return (
    with alloc as (
      select * from private.sale_allocations(p_store_id, v_from, v_to, null)
    ),
    sales_by_terminal as (
      select coalesce(terminal_id, 'Desconhecido') as terminal_id,
             sum(amount) as total_vendas,
             sum(amount) filter (where is_cash) as dinheiro,
             sum(amount) filter (where not is_cash) as cartoes
      from alloc group by coalesce(terminal_id, 'Desconhecido')
    ),
    openings as (
      select terminal_id, sum(opening_amount) as suprimento
      from public.cash_sessions
      where store_id = p_store_id and opened_at >= v_from and opened_at < v_to
      group by terminal_id
    ),
    moves as (
      select terminal_id,
             sum(amount) filter (where kind = 'suprimento') as suprimento,
             sum(amount) filter (where kind = 'sangria') as sangrias
      from public.cash_movements
      where store_id = p_store_id and occurred_at >= v_from and occurred_at < v_to
      group by terminal_id
    ),
    terminals as (
      select terminal_id from sales_by_terminal
      union select terminal_id from openings
      union select terminal_id from moves
    ),
    rows as (
      select t.terminal_id,
             round(coalesce(sb.total_vendas, 0), 2) as total_vendas,
             round(coalesce(sb.dinheiro, 0), 2) as dinheiro,
             round(coalesce(sb.cartoes, 0), 2) as cartoes,
             round(coalesce(o.suprimento, 0) + coalesce(m.suprimento, 0), 2) as suprimento,
             round(coalesce(m.sangrias, 0), 2) as sangrias
      from terminals t
      left join sales_by_terminal sb on sb.terminal_id = t.terminal_id
      left join openings o on o.terminal_id = t.terminal_id
      left join moves m on m.terminal_id = t.terminal_id
    )
    select jsonb_build_object(
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'terminal_id', r.terminal_id,
                 'total_vendas', r.total_vendas,
                 'dinheiro', r.dinheiro,
                 'cartoes', r.cartoes,
                 'suprimento', r.suprimento,
                 'sangrias', r.sangrias,
                 'saldo_gaveta', r.suprimento + r.dinheiro - r.sangrias
               ) order by r.terminal_id)
        from rows r
      ), '[]'::jsonb),
      'total_gaveta', coalesce((select sum(suprimento + dinheiro - sangrias) from rows), 0),
      'total_cartoes', coalesce((select sum(cartoes) from rows), 0),
      'faturamento', coalesce((select sum(total_vendas) from rows), 0)
    )
  );
end;
$$;

-- ─── Dashboard (todo o período, ou um intervalo) ────────────────────
create or replace function public.report_dashboard(p_store_id text, p_from date default null, p_to date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_from timestamptz := case when p_from is null then null else private.br_start(p_from) end;
  v_to timestamptz := case when p_to is null then null else private.br_start(p_to + 1) end;
begin
  perform private.assert_store_access(p_store_id, 'supervisor');
  return (
    with items as (
      select si.product_id, si.product_name, si.unit_price, si.status,
             coalesce(s.terminal_id, 'N/D') as terminal_id
      from public.sale_items si
      join public.sales s on s.id = si.sale_id
      where si.store_id = p_store_id
        and (v_from is null or s.sold_at >= v_from)
        and (v_to is null or s.sold_at < v_to)
    ),
    active as (select * from items where status = 'active'),
    kpi as (
      select
        coalesce(sum(unit_price) filter (where unit_price >= 0), 0) as bruto,
        coalesce(sum(unit_price) filter (where unit_price >= 0 and status = 'cancelled'), 0)
          + coalesce(sum(-unit_price) filter (where unit_price < 0 and status = 'active'), 0) as cancelado,
        count(*) filter (where unit_price >= 0 and status = 'active') as validos,
        count(*) filter (where (unit_price >= 0 and status = 'cancelled') or (unit_price < 0 and status = 'active')) as cancelados,
        coalesce(sum(unit_price) filter (where unit_price >= 0 and status = 'active'), 0) as vendido_ativo
      from items
    )
    select jsonb_build_object(
      'faturamento_bruto', k.bruto,
      'valor_cancelado', k.cancelado,
      'faturamento_liquido', greatest(k.bruto - k.cancelado, 0),
      'tickets_validos', k.validos,
      'tickets_cancelados', k.cancelados,
      'ticket_medio', case when k.validos > 0 then round(k.vendido_ativo / k.validos, 2) else 0 end,
      'top_products', coalesce((
        select jsonb_agg(x order by x.total desc) from (
          select product_name as name, sum(unit_price) as total from active
          where unit_price >= 0 group by product_name order by sum(unit_price) desc limit 10
        ) x
      ), '[]'::jsonb),
      'by_payment', coalesce((
        select jsonb_agg(x order by x.total desc) from (
          select upper(method_name) as name, round(sum(amount), 2) as total
          from private.sale_allocations(p_store_id, v_from, v_to, null)
          where kind = 'sale'
          group by upper(method_name)
        ) x
      ), '[]'::jsonb),
      'by_terminal', coalesce((
        select jsonb_agg(x order by x.total desc) from (
          select terminal_id as name, sum(unit_price) as total from active
          where unit_price >= 0 group by terminal_id
        ) x
      ), '[]'::jsonb),
      'by_subgroup', coalesce((
        select jsonb_agg(x order by x.total desc) from (
          select coalesce(sg.name, 'Outros') as name, sum(a.unit_price) as total
          from active a
          left join public.products p on p.store_id = p_store_id and p.id = a.product_id
          left join public.product_subgroups sg on sg.store_id = p_store_id and sg.id = p.subgroup_id
          where a.unit_price >= 0
          group by coalesce(sg.name, 'Outros')
        ) x
      ), '[]'::jsonb)
    )
    from kpi k
  );
end;
$$;

-- ─── Backup: todos os dados da loja em um JSON ──────────────────────
create or replace function public.export_store_data(p_store_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_store_access(p_store_id, 'admin');
  return jsonb_build_object(
    'exported_at', now(),
    'store', (select to_jsonb(s) from public.stores s where s.id = p_store_id),
    'settings', (select to_jsonb(x) from public.store_settings x where x.store_id = p_store_id),
    'products', coalesce((select jsonb_agg(to_jsonb(x)) from public.products x where x.store_id = p_store_id), '[]'::jsonb),
    'groups', coalesce((select jsonb_agg(to_jsonb(x)) from public.product_groups x where x.store_id = p_store_id), '[]'::jsonb),
    'subgroups', coalesce((select jsonb_agg(to_jsonb(x)) from public.product_subgroups x where x.store_id = p_store_id), '[]'::jsonb),
    'payment_methods', coalesce((select jsonb_agg(to_jsonb(x)) from public.payment_methods x where x.store_id = p_store_id), '[]'::jsonb),
    'printers', coalesce((select jsonb_agg(to_jsonb(x)) from public.printers x where x.store_id = p_store_id), '[]'::jsonb),
    'terminals', coalesce((select jsonb_agg(to_jsonb(x)) from public.terminals x where x.store_id = p_store_id), '[]'::jsonb),
    'documents', coalesce((select jsonb_agg(to_jsonb(x)) from public.store_documents x where x.store_id = p_store_id), '[]'::jsonb),
    'records', coalesce((select jsonb_agg(to_jsonb(x)) from public.store_records x where x.store_id = p_store_id), '[]'::jsonb),
    'cash_sessions', coalesce((select jsonb_agg(to_jsonb(x)) from public.cash_sessions x where x.store_id = p_store_id), '[]'::jsonb),
    'cash_movements', coalesce((select jsonb_agg(to_jsonb(x)) from public.cash_movements x where x.store_id = p_store_id), '[]'::jsonb),
    'sales', coalesce((select jsonb_agg(to_jsonb(x)) from public.sales x where x.store_id = p_store_id), '[]'::jsonb),
    'sale_items', coalesce((select jsonb_agg(to_jsonb(x)) from public.sale_items x where x.store_id = p_store_id), '[]'::jsonb),
    'sale_payments', coalesce((select jsonb_agg(to_jsonb(x)) from public.sale_payments x where x.store_id = p_store_id), '[]'::jsonb)
  );
end;
$$;

revoke all on function private.br_start(date), private.sale_allocations(text, timestamptz, timestamptz, uuid) from public, anon, authenticated;
revoke all on function
  public.report_sales_by_product(text, date, date),
  public.report_sales_by_terminal(text, date, date),
  public.report_cash_closing(text, date, date),
  public.report_dashboard(text, date, date),
  public.export_store_data(text)
from public, anon;
grant execute on function
  public.report_sales_by_product(text, date, date),
  public.report_sales_by_terminal(text, date, date),
  public.report_cash_closing(text, date, date),
  public.report_dashboard(text, date, date),
  public.export_store_data(text)
to authenticated;
