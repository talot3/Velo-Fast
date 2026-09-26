-- ════════════════════════════════════════════════════════════════════
-- Migração do sistema anterior (v1) no MESMO projeto Supabase.
--
-- Se as tabelas da v1 existirem (system_data, app_users, app_settings e as
-- versões antigas de stores / printer_bridges / print_jobs), elas são
-- MOVIDAS para o schema "legacy" — nada é apagado — liberando os nomes
-- para o schema novo. Num projeto novo/vazio esta migração não faz nada.
--
-- Depois, scripts/import-legacy.mjs lê esses dados (via legacy_export_state)
-- e grava nas tabelas novas. Para voltar atrás: mova as tabelas de volta
-- para public (alter table legacy.x set schema public).
-- ════════════════════════════════════════════════════════════════════

do $$
declare
  moved text[] := '{}';
begin
  if to_regclass('public.system_data') is null then
    return;
  end if;

  create schema if not exists legacy;
  revoke all on schema legacy from public;

  alter table public.system_data set schema legacy;
  moved := array_append(moved, 'system_data');

  if to_regclass('public.app_users') is not null then
    alter table public.app_users set schema legacy;
    moved := array_append(moved, 'app_users');
  end if;
  if to_regclass('public.app_settings') is not null then
    alter table public.app_settings set schema legacy;
    moved := array_append(moved, 'app_settings');
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'stores' and column_name = 'active_terminals') then
    alter table public.stores set schema legacy;
    moved := array_append(moved, 'stores');
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'printer_bridges' and column_name = 'api_key_hash') then
    alter table public.printer_bridges set schema legacy;
    moved := array_append(moved, 'printer_bridges');
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'print_jobs' and column_name = 'payload') then
    alter table public.print_jobs set schema legacy;
    moved := array_append(moved, 'print_jobs');
  end if;

  raise notice 'Tabelas da v1 movidas para o schema legacy: %', moved;
end $$;

-- Exporta os dados da v1 (lojas, usuários com hash bcrypt, estado de cada
-- loja) para o importador. Só a service role executa.
create or replace function public.legacy_export_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_states jsonb := '[]'::jsonb;
  v_stores jsonb := '[]'::jsonb;
  v_users jsonb := '[]'::jsonb;
begin
  if to_regclass('legacy.system_data') is null then
    return jsonb_build_object('available', false);
  end if;
  execute $q$
    select coalesce(jsonb_agg(jsonb_build_object('store_id', store_id, 'value', value)), '[]'::jsonb)
    from legacy.system_data where key = 'state'
  $q$ into v_states;
  if to_regclass('legacy.stores') is not null then
    execute $q$ select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) from legacy.stores s $q$ into v_stores;
  end if;
  if to_regclass('legacy.app_users') is not null then
    execute $q$ select coalesce(jsonb_agg(to_jsonb(u)), '[]'::jsonb) from legacy.app_users u $q$ into v_users;
  end if;
  return jsonb_build_object('available', true, 'states', v_states, 'stores', v_stores, 'users', v_users);
end;
$$;

revoke all on function public.legacy_export_state() from public, anon, authenticated;
grant execute on function public.legacy_export_state() to service_role;
