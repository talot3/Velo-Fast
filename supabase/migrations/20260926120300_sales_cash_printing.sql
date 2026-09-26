-- ════════════════════════════════════════════════════════════════════
-- Vendas, caixa e fila de impressão.
--
-- * Uma venda (sales) tem itens (sale_items, uma linha por ficha/unidade,
--   como o sistema antigo) e pagamentos (sale_payments, com o valor de
--   cada forma — o antigo só guardava o texto "DINHEIRO + PIX").
-- * O ID da venda e dos itens é gerado no PDV: reenviar a mesma venda
--   (fila offline) nunca duplica.
-- * Caixa (abertura, sangria, suprimento, fechamento) fica no banco, por
--   terminal — antes existia só no navegador do caixa.
-- * Nada disso é gravado direto pelo navegador: só pelas funções RPC.
-- ════════════════════════════════════════════════════════════════════

create table public.cash_sessions (
  id uuid primary key,
  store_id text not null references public.stores (id) on delete cascade,
  terminal_id text not null,
  operator_id uuid references auth.users (id) on delete set null,
  operator_name text not null,
  opened_at timestamptz not null,
  opening_amount numeric(12, 2) not null default 0 check (opening_amount >= 0),
  status text not null default 'open' check (status in ('open', 'closed')),
  closed_at timestamptz,
  closed_by uuid references auth.users (id) on delete set null,
  closed_by_name text,
  closing jsonb,
  created_at timestamptz not null default now()
);

create unique index cash_sessions_one_open on public.cash_sessions (store_id, terminal_id) where status = 'open';
create index cash_sessions_store_opened_idx on public.cash_sessions (store_id, opened_at desc);

create table public.cash_movements (
  id uuid primary key,
  store_id text not null references public.stores (id) on delete cascade,
  session_id uuid references public.cash_sessions (id) on delete cascade,
  terminal_id text not null,
  kind text not null check (kind in ('sangria', 'suprimento')),
  amount numeric(12, 2) not null check (amount > 0),
  reason text,
  operator_id uuid references auth.users (id) on delete set null,
  operator_name text not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  legacy_id text
);

create index cash_movements_session_idx on public.cash_movements (session_id);
create index cash_movements_store_time_idx on public.cash_movements (store_id, occurred_at desc);

create table public.sales (
  id uuid primary key,
  store_id text not null references public.stores (id) on delete cascade,
  kind text not null default 'sale' check (kind in ('sale', 'refund')),
  terminal_id text,
  terminal_name text,
  operator_id uuid references auth.users (id) on delete set null,
  operator_name text not null,
  authorized_by uuid references auth.users (id) on delete set null,
  authorized_by_name text,
  cash_session_id uuid references public.cash_sessions (id) on delete set null,
  total numeric(12, 2) not null,
  paid_total numeric(12, 2) not null default 0,
  change_total numeric(12, 2) not null default 0,
  -- Texto das formas de pagamento como no sistema antigo ("DINHEIRO + PIX").
  payment_label text not null default '',
  sold_at timestamptz not null,
  created_at timestamptz not null default now(),
  legacy_id text,
  meta jsonb not null default '{}'::jsonb
);

create index sales_store_sold_idx on public.sales (store_id, sold_at desc);
create index sales_cash_session_idx on public.sales (cash_session_id);

create table public.sale_items (
  id uuid primary key,
  sale_id uuid not null references public.sales (id) on delete cascade,
  store_id text not null references public.stores (id) on delete cascade,
  line_no integer not null,
  product_id text,
  product_name text not null,
  -- Negativo em crédito de troca e estorno.
  unit_price numeric(12, 2) not null,
  printer_id text,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users (id) on delete set null,
  cancelled_by_name text,
  cancel_reason text,
  print_count integer not null default 0,
  last_printed_at timestamptz,
  legacy_id text
);

create index sale_items_sale_idx on public.sale_items (sale_id);
create index sale_items_store_product_idx on public.sale_items (store_id, product_id);

create table public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  store_id text not null references public.stores (id) on delete cascade,
  line_no integer not null,
  method_id text,
  method_name text not null,
  amount numeric(12, 2) not null
);

create index sale_payments_sale_idx on public.sale_payments (sale_id);

-- ─── Impressão ──────────────────────────────────────────────────────
-- A ponte local se autentica com uma chave própria. Guardamos só o
-- prefixo (para achar a ponte em uma consulta) e o SHA-256 da chave.
create table public.printer_bridges (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references public.stores (id) on delete cascade,
  name text not null,
  key_prefix text not null unique,
  key_hash text not null,
  active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create index printer_bridges_store_idx on public.printer_bridges (store_id);

-- Trabalhos de impressão com dados estruturados; a ponte monta o ESC/POS.
create table public.print_jobs (
  id bigint generated always as identity primary key,
  store_id text not null references public.stores (id) on delete cascade,
  printer_id text,
  kind text not null check (kind in ('ficha', 'sangria', 'fechamento', 'teste')),
  data jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'printing', 'done', 'failed')),
  attempts integer not null default 0,
  claimed_at timestamptz,
  printed_at timestamptz,
  error text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index print_jobs_queue_idx on public.print_jobs (store_id, created_at) where status in ('pending', 'printing');
create index print_jobs_store_created_idx on public.print_jobs (store_id, created_at desc);

-- ─── RLS: leitura para membros da loja; escrita só por RPC ─────────
alter table public.cash_sessions enable row level security;
alter table public.cash_movements enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.sale_payments enable row level security;
alter table public.printer_bridges enable row level security;
alter table public.print_jobs enable row level security;

create policy cash_sessions_select on public.cash_sessions for select to authenticated
  using ((select private.can_access_store(store_id)));
create policy cash_movements_select on public.cash_movements for select to authenticated
  using ((select private.can_access_store(store_id)));
create policy sales_select on public.sales for select to authenticated
  using ((select private.can_access_store(store_id)));
create policy sale_items_select on public.sale_items for select to authenticated
  using ((select private.can_access_store(store_id)));
create policy sale_payments_select on public.sale_payments for select to authenticated
  using ((select private.can_access_store(store_id)));
create policy print_jobs_select on public.print_jobs for select to authenticated
  using ((select private.can_access_store(store_id)));
-- Pontes: status visível para admin da loja e master (a chave nunca sai).
create policy printer_bridges_select on public.printer_bridges for select to authenticated
  using ((select private.can_manage_store(store_id, 'admin')));

-- O hash da chave nunca é legível pelo navegador: acesso só às outras colunas.
revoke all on public.printer_bridges from anon, authenticated;
grant select (id, store_id, name, key_prefix, active, last_seen_at, created_at)
  on public.printer_bridges to authenticated;
