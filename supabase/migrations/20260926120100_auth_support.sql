-- ════════════════════════════════════════════════════════════════════
-- Apoio ao login por usuário + senha/PIN (feito pela função /api/auth/login
-- com a service role). Nenhuma destas funções pode ser chamada pelo
-- navegador: execute só para service_role.
-- ════════════════════════════════════════════════════════════════════

-- Busca o usuário para login. p_store_id nulo = login master (gelic).
create or replace function public.auth_login_lookup(p_store_id text, p_username text)
returns table (
  user_id uuid,
  email text,
  username text,
  role text,
  active boolean,
  store_id text,
  store_name text,
  store_active boolean,
  store_expire_date date,
  password_hash text,
  failed_attempts integer,
  locked_until timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, u.email::text, p.username, p.role, p.active,
         p.store_id, s.name, s.active, s.expire_date,
         c.password_hash, c.failed_attempts, c.locked_until
  from public.profiles p
  join auth.users u on u.id = p.user_id
  join private.credentials c on c.user_id = p.user_id
  left join public.stores s on s.id = p.store_id
  where coalesce(p.store_id, '*') = coalesce(p_store_id, '*')
    and lower(p.username) = lower(trim(p_username))
$$;

-- Registra o resultado da tentativa: 10 erros seguidos bloqueiam 15 minutos.
create or replace function public.auth_login_result(p_user_id uuid, p_success boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_success then
    update private.credentials
       set failed_attempts = 0, locked_until = null
     where user_id = p_user_id;
  else
    update private.credentials
       set failed_attempts = failed_attempts + 1,
           locked_until = case when failed_attempts + 1 >= 10 then now() + interval '15 minutes' else locked_until end
     where user_id = p_user_id;
  end if;
end;
$$;

-- Grava/troca a senha (hash bcrypt gerado no servidor).
create or replace function public.auth_set_password_hash(p_user_id uuid, p_password_hash text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.credentials (user_id, password_hash)
  values (p_user_id, p_password_hash)
  on conflict (user_id) do update
    set password_hash = excluded.password_hash,
        failed_attempts = 0,
        locked_until = null,
        updated_at = now()
$$;

revoke all on function public.auth_login_lookup(text, text) from public, anon, authenticated;
revoke all on function public.auth_login_result(uuid, boolean) from public, anon, authenticated;
revoke all on function public.auth_set_password_hash(uuid, text) from public, anon, authenticated;
grant execute on function public.auth_login_lookup(text, text) to service_role;
grant execute on function public.auth_login_result(uuid, boolean) to service_role;
grant execute on function public.auth_set_password_hash(uuid, text) to service_role;
