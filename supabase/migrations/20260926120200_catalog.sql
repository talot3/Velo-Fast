-- ════════════════════════════════════════════════════════════════════
-- Catálogo e configuração da loja.
--
-- IDs são texto para preservar os IDs numéricos do sistema antigo
-- (ex.: '101', '1712345678901') e aceitar UUIDs novos. A chave primária é
-- (store_id, id) e as referências incluem store_id, então um item de uma
-- loja nunca aponta para outra.
--
-- Colunas "extra" guardam campos legados sem coluna própria, para que a
-- importação não perca nada.
-- ════════════════════════════════════════════════════════════════════

create table public.printers (
  store_id text not null references public.stores (id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  name text not null default '',
  ip text,
  port integer not null default 9100 check (port between 1 and 65535),
  use_windows_printer boolean not null default false,
  -- Nome/caminho da impressora compartilhada do Windows. Só letras, números,
  -- espaço e . _ - ( ) \ — a ponte nunca repassa isso a um shell.
  system_name text check (system_name is null or system_name ~ '^[A-Za-z0-9 ._()\\$-]{1,128}$'),
  paper_width integer not null default 48 check (paper_width between 16 and 96),
  active_cut boolean not null default true,
  lines_before integer not null default 4 check (lines_before between 0 and 20),
  lines_after integer not null default 0 check (lines_after between 0 and 20),
  align_spacing integer not null default 2 check (align_spacing between 0 and 20),
  sort_order integer not null default 0,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (store_id, id)
);

create table public.terminals (
  store_id text not null references public.stores (id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  name text not null default '',
  cash_number integer,
  printer_id text,
  active boolean not null default true,
  sort_order integer not null default 0,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (store_id, id),
  foreign key (store_id, printer_id) references public.printers (store_id, id) on delete set null (printer_id)
);

create table public.payment_methods (
  store_id text not null references public.stores (id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  name text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (store_id, id)
);

create table public.product_groups (
  store_id text not null references public.stores (id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  name text not null,
  sort_order integer not null default 0,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (store_id, id)
);

create table public.product_subgroups (
  store_id text not null references public.stores (id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  group_id text,
  name text not null,
  button_color text,
  text_color text,
  sort_order integer not null default 0,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (store_id, id),
  foreign key (store_id, group_id) references public.product_groups (store_id, id) on delete set null (group_id)
);

create table public.products (
  store_id text not null references public.stores (id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  subgroup_id text,
  printer_id text,
  code text,
  name text not null,
  price numeric(12, 2) not null default 0,
  cost numeric(12, 2),
  -- null = sem controle de estoque
  stock numeric(14, 3),
  unit text,
  icon text,
  description text,
  use_name_on_print boolean not null default true,
  active boolean not null default true,
  sort_order integer not null default 0,
  -- Dados do módulo de precificação (ficha técnica, custos, margens).
  pricing jsonb,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (store_id, id),
  foreign key (store_id, subgroup_id) references public.product_subgroups (store_id, id) on delete set null (subgroup_id),
  foreign key (store_id, printer_id) references public.printers (store_id, id) on delete set null (printer_id)
);

create index terminals_printer_idx on public.terminals (store_id, printer_id);
create index product_subgroups_group_idx on public.product_subgroups (store_id, group_id);
create index products_subgroup_idx on public.products (store_id, subgroup_id);
create index products_printer_idx on public.products (store_id, printer_id);

-- Configuração geral da loja (títulos do ticket, versão exibida).
create table public.store_settings (
  store_id text primary key references public.stores (id) on delete cascade,
  ticket_config jsonb not null default '{}'::jsonb,
  current_version text not null default '1.0.0',
  versions jsonb not null default '[]'::jsonb,
  extra jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Documentos por módulo do portal (financeiro, DRE, planos, etc.). Cada
-- módulo grava só a sua chave; nada de "salvar o estado inteiro".
create table public.store_documents (
  store_id text not null references public.stores (id) on delete cascade,
  key text not null check (key ~ '^[A-Za-z0-9_.-]{1,64}$'),
  data jsonb not null,
  version integer not null default 1,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (store_id, key)
);

do $$
declare t text;
begin
  foreach t in array array['printers', 'terminals', 'payment_methods', 'product_groups', 'product_subgroups', 'products', 'store_settings', 'store_documents']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function private.touch_updated_at()', t || '_touch', t);
  end loop;
end $$;

-- store_documents: incrementa a versão a cada gravação (controle de conflito).
create or replace function private.bump_document_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.version := old.version + 1;
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

create trigger store_documents_version before update on public.store_documents
  for each row execute function private.bump_document_version();

-- Limite de terminais da licença (stores.terminals_allowed).
create or replace function private.enforce_terminal_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allowed integer;
  v_count integer;
begin
  if not new.active then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.active then
    return new;
  end if;
  select terminals_allowed into v_allowed from public.stores where id = new.store_id;
  select count(*) into v_count from public.terminals where store_id = new.store_id and active;
  if v_count >= coalesce(v_allowed, 0) then
    raise exception 'Limite de % terminal(is) da licença atingido.', v_allowed
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger terminals_limit before insert or update of active on public.terminals
  for each row execute function private.enforce_terminal_limit();

-- ─── RLS ────────────────────────────────────────────────────────────
-- Leitura: qualquer membro ativo da loja (o PDV precisa do catálogo).
-- Escrita: supervisor ou acima (igual ao antigo /api/save).
do $$
declare t text;
begin
  foreach t in array array['printers', 'terminals', 'payment_methods', 'product_groups', 'product_subgroups', 'products', 'store_settings']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy %I on public.%I for select to authenticated
      using ((select private.can_access_store(store_id)))$p$, t || '_select', t);
    execute format($p$create policy %I on public.%I for insert to authenticated
      with check ((select private.can_manage_store(store_id, 'supervisor')))$p$, t || '_insert', t);
    execute format($p$create policy %I on public.%I for update to authenticated
      using ((select private.can_manage_store(store_id, 'supervisor')))
      with check ((select private.can_manage_store(store_id, 'supervisor')))$p$, t || '_update', t);
    execute format($p$create policy %I on public.%I for delete to authenticated
      using ((select private.can_manage_store(store_id, 'supervisor')))$p$, t || '_delete', t);
  end loop;
end $$;

-- Documentos do portal: leitura e escrita a partir de supervisor.
alter table public.store_documents enable row level security;
create policy store_documents_select on public.store_documents for select to authenticated
  using ((select private.can_manage_store(store_id, 'supervisor')));
create policy store_documents_insert on public.store_documents for insert to authenticated
  with check ((select private.can_manage_store(store_id, 'supervisor')));
create policy store_documents_update on public.store_documents for update to authenticated
  using ((select private.can_manage_store(store_id, 'supervisor')))
  with check ((select private.can_manage_store(store_id, 'supervisor')));
create policy store_documents_delete on public.store_documents for delete to authenticated
  using ((select private.can_manage_store(store_id, 'admin')));
