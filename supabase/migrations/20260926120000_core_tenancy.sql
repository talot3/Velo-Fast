-- ════════════════════════════════════════════════════════════════════
-- VELO FAST v2 — núcleo multi-loja
--
-- Modelo de segurança:
--   * Cada usuário do app é um usuário do Supabase Auth com um perfil em
--     public.profiles (loja + papel). O papel "master" (painel gelic) não
--     pertence a nenhuma loja.
--   * A loja de quem está logado vem SEMPRE do perfil no banco — nunca de
--     um cabeçalho ou parâmetro enviado pelo navegador.
--   * Loja bloqueada ou com licença vencida = nenhum acesso (exceto master).
--   * Usuário desativado perde o acesso na hora (a checagem é no banco,
--     não no token).
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- updated_at automático
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Data de hoje no fuso da operação (as lojas estão no Brasil).
create or replace function private.today_br()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

-- ─── Lojas (empresas licenciadas) ───────────────────────────────────
create table public.stores (
  id text primary key check (id ~ '^[A-Za-z0-9_-]{1,32}$'),
  name text not null check (length(trim(name)) > 0),
  cnpj text,
  phone text,
  active boolean not null default true,
  expire_date date,
  terminals_allowed integer not null default 5 check (terminals_allowed between 0 and 999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger stores_touch before update on public.stores
  for each row execute function private.touch_updated_at();

-- ─── Perfis (um por usuário do Auth) ────────────────────────────────
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  store_id text references public.stores (id) on delete cascade,
  username text not null check (length(trim(username)) between 1 and 64),
  display_name text,
  role text not null check (role in ('operador', 'supervisor', 'admin', 'master')),
  active boolean not null default true,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_store_scope check ((role = 'master') = (store_id is null))
);

create unique index profiles_login_key on public.profiles (coalesce(store_id, '*'), lower(username));
create index profiles_store_id_idx on public.profiles (store_id);

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();

-- Senhas do app (bcrypt). Ficam fora do schema exposto pela API REST: só a
-- função de login (service role) lê. Permite PIN curto e senhas legadas.
create table private.credentials (
  user_id uuid primary key references auth.users (id) on delete cascade,
  password_hash text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

-- ─── Funções de sessão (usadas pelas políticas RLS) ────────────────
-- Todas são SECURITY DEFINER com search_path vazio e devem ser chamadas
-- nas políticas como (select private.fn()) para rodar uma vez por consulta.

create or replace function private.role_level(p_role text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'operador' then 1
    when 'supervisor' then 2
    when 'admin' then 3
    when 'master' then 4
    else 0
  end
$$;

-- Perfil ativo de quem está logado, só se a licença da loja estiver válida.
create or replace function private.session_profile()
returns table (user_id uuid, store_id text, role text, username text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.store_id, p.role, p.username
  from public.profiles p
  left join public.stores s on s.id = p.store_id
  where p.user_id = (select auth.uid())
    and p.active
    and (
      p.role = 'master'
      or (s.active and (s.expire_date is null or s.expire_date >= private.today_br()))
    )
$$;

create or replace function private.current_store_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select store_id from private.session_profile()
$$;

create or replace function private.current_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from private.session_profile()
$$;

create or replace function private.is_master()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select role = 'master' from private.session_profile()), false)
$$;

create or replace function private.has_role(p_min_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select private.role_level(role) >= private.role_level(p_min_role) from private.session_profile()),
    false
  )
$$;

-- Pode agir sobre esta loja? (membro ativo dela, ou master)
create or replace function private.can_access_store(p_store_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select sp.role = 'master' or sp.store_id = p_store_id from private.session_profile() sp),
    false
  )
$$;

-- Mesma checagem, exigindo papel mínimo na loja.
create or replace function private.can_manage_store(p_store_id text, p_min_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select sp.role = 'master'
        or (sp.store_id = p_store_id and private.role_level(sp.role) >= private.role_level(p_min_role))
      from private.session_profile() sp
    ),
    false
  )
$$;

-- Erro padronizado para as RPCs.
create or replace function private.assert_store_access(p_store_id text, p_min_role text default 'operador')
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.can_manage_store(p_store_id, p_min_role) then
    raise exception 'Sem permissão para esta ação nesta loja.'
      using errcode = '42501';
  end if;
end;
$$;

revoke all on all functions in schema private from public;
grant execute on function
  private.role_level(text),
  private.session_profile(),
  private.current_store_id(),
  private.current_role(),
  private.is_master(),
  private.has_role(text),
  private.can_access_store(text),
  private.can_manage_store(text, text),
  private.assert_store_access(text, text),
  private.today_br()
to authenticated, service_role;

-- ─── RLS: lojas e perfis ────────────────────────────────────────────
alter table public.stores enable row level security;
alter table public.profiles enable row level security;

-- A própria loja fica visível para os membros; o master vê todas.
create policy stores_select on public.stores
  for select to authenticated
  using ((select private.can_access_store(id)));

-- Só o master cria/edita lojas e licenças (pelo painel gelic).
create policy stores_master_write on public.stores
  for all to authenticated
  using ((select private.is_master()))
  with check ((select private.is_master()));

-- Perfis: cada um vê o próprio; admin vê os da sua loja; master vê todos.
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.can_manage_store(store_id, 'admin'))
    or (select private.is_master())
  );
-- Escrita de perfis só pelas funções de servidor (service role), que
-- também criam o usuário no Auth e a senha.
