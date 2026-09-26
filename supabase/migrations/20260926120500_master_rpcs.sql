-- ════════════════════════════════════════════════════════════════════
-- Painel master (gelic): lojas e licenças. Só o papel master executa.
-- ════════════════════════════════════════════════════════════════════

create or replace function private.assert_master()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_master() then
    raise exception 'Apenas o painel master pode fazer isso.' using errcode = '42501';
  end if;
end;
$$;

-- Lista de lojas com o status da ponte de impressão (online = sinal nos
-- últimos 30 segundos).
create or replace function public.master_list_stores()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_master();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'cnpj', s.cnpj,
      'phone', s.phone,
      'active', s.active,
      'expireDate', s.expire_date,
      'terminalsAllowed', s.terminals_allowed,
      'activeTerminals', (select count(*) from public.terminals t where t.store_id = s.id and t.active),
      'bridge', (
        select jsonb_build_object(
          'online', coalesce(b.last_seen_at > now() - interval '30 seconds', false),
          'lastSeenAt', b.last_seen_at,
          'name', b.name
        )
        from public.printer_bridges b
        where b.store_id = s.id and b.active
        order by b.last_seen_at desc nulls last
        limit 1
      )
    ) order by
      case when s.id ~ '^[0-9]+$' then lpad(s.id, 20, '0') else s.id end)
    from public.stores s
  ), '[]'::jsonb);
end;
$$;

-- Cria a loja com o próximo código numérico (a partir de 16001).
create or replace function public.master_create_store(
  p_name text,
  p_cnpj text,
  p_phone text default null,
  p_terminals_allowed integer default 5,
  p_expire_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text;
  v_store public.stores;
begin
  perform private.assert_master();
  if length(trim(coalesce(p_name, ''))) < 3 then
    raise exception 'Por favor, digite uma Razão Social válida (mínimo 3 caracteres).' using errcode = '22023';
  end if;
  if regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g') !~ '^[0-9]{14}$' then
    raise exception 'Por favor, informe um CNPJ válido com 14 dígitos numéricos.' using errcode = '22023';
  end if;

  -- Serializa a geração do código para duas criações simultâneas.
  perform pg_advisory_xact_lock(hashtext('velofast.master_create_store'));
  select (greatest(16000, coalesce(max(id::bigint), 16000)) + 1)::text into v_id
  from public.stores where id ~ '^[0-9]{1,18}$';

  insert into public.stores (id, name, cnpj, phone, active, expire_date, terminals_allowed)
  values (
    v_id,
    upper(trim(p_name)),
    regexp_replace(p_cnpj, '\D', '', 'g'),
    coalesce(nullif(trim(p_phone), ''), 'N/A'),
    true,
    coalesce(p_expire_date, (private.today_br() + interval '1 year')::date),
    greatest(coalesce(p_terminals_allowed, 5), 1)
  )
  returning * into v_store;

  insert into public.store_settings (store_id, versions)
  values (v_id, jsonb_build_array(jsonb_build_object(
    'id', 1,
    'version', '1.0.0',
    'date', now(),
    'description', 'Versão inicial de lançamento do sistema VELO com controle de vendas e impressão de cupom.'
  )));

  return jsonb_build_object(
    'id', v_store.id,
    'name', v_store.name,
    'cnpj', v_store.cnpj,
    'phone', v_store.phone,
    'active', v_store.active,
    'expireDate', v_store.expire_date,
    'terminalsAllowed', v_store.terminals_allowed,
    'activeTerminals', 0
  );
end;
$$;

-- Liberar/bloquear, vencimento e limite de terminais.
create or replace function public.master_update_store(
  p_store_id text,
  p_active boolean default null,
  p_expire_date date default null,
  p_terminals_allowed integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store public.stores;
begin
  perform private.assert_master();
  update public.stores
     set active = coalesce(p_active, active),
         expire_date = coalesce(p_expire_date, expire_date),
         -- greatest() ignora NULL: sem este case, bloquear/liberar zerava o limite para 1.
         terminals_allowed = case when p_terminals_allowed is null then terminals_allowed else greatest(p_terminals_allowed, 1) end
   where id = p_store_id
  returning * into v_store;
  if not found then
    raise exception 'Loja não encontrada.' using errcode = 'P0002';
  end if;
  return jsonb_build_object(
    'id', v_store.id,
    'name', v_store.name,
    'cnpj', v_store.cnpj,
    'phone', v_store.phone,
    'active', v_store.active,
    'expireDate', v_store.expire_date,
    'terminalsAllowed', v_store.terminals_allowed,
    'activeTerminals', (select count(*) from public.terminals t where t.store_id = v_store.id and t.active)
  );
end;
$$;

revoke all on function private.assert_master() from public, anon, authenticated;
revoke all on function public.master_list_stores(), public.master_create_store(text, text, text, integer, date),
  public.master_update_store(text, boolean, date, integer) from public, anon;
grant execute on function public.master_list_stores(), public.master_create_store(text, text, text, integer, date),
  public.master_update_store(text, boolean, date, integer) to authenticated;
