-- Coin Center core schema. Apply only to the isolated Coin Center Supabase project.
-- No arbitrary first-user admin claim. Owner role must be provisioned out-of-band by a trusted operator.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','support','customer')),
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id),
  primary key (user_id, role)
);

create table if not exists public.wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  currency text not null default 'COIN' check (currency = 'COIN'),
  balance bigint not null default 0 check (balance >= 0),
  status text not null default 'active' check (status in ('active','frozen','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallet_accounts(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  entry_type text not null check (entry_type in ('credit','debit','adjustment','refund','withdrawal')),
  amount bigint not null check (amount > 0),
  balance_after bigint not null check (balance_after >= 0),
  reference_type text not null,
  reference_id uuid,
  idempotency_key text not null unique,
  description text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  coin_amount bigint not null check (coin_amount > 0),
  price_minor bigint not null check (price_minor > 0),
  currency text not null default 'EGP' check (currency = 'EGP'),
  active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  package_id uuid references public.packages(id) on delete restrict,
  recipient_handle text not null check (length(recipient_handle) between 2 and 32),
  coin_amount bigint not null check (coin_amount > 0),
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null default 'EGP' check (currency = 'EGP'),
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment','payment_review','paid','queued','processing','completed','rejected','cancelled','refunded','failed')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','submitted','under_review','confirmed','rejected','refunded')),
  supplier_status text not null default 'not_submitted'
    check (supplier_status in ('not_submitted','submitted','processing','delivered','failed')),
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, idempotency_key)
);

create table if not exists public.payment_evidence (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  provider text not null,
  provider_reference text,
  storage_path text,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'EGP' check (currency = 'EGP'),
  status text not null default 'submitted' check (status in ('submitted','under_review','confirmed','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_lots (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  reference text not null unique,
  quantity bigint not null check (quantity > 0),
  available_quantity bigint not null default 0 check (available_quantity >= 0),
  status text not null default 'pending_verification'
    check (status in ('pending_verification','verified','available','depleted','rejected')),
  ownership_verified_at timestamptz,
  verified_by uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now(),
  check (available_quantity <= quantity),
  check (status <> 'available' or ownership_verified_at is not null)
);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  actor_id uuid references auth.users(id),
  event_type text not null,
  from_status text,
  to_status text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  order_id uuid references public.orders(id) on delete restrict,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  assigned_to uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_user_created on public.orders(user_id, created_at desc);
create index if not exists idx_orders_status_created on public.orders(status, created_at desc);
create index if not exists idx_ledger_user_created on public.wallet_ledger(user_id, created_at desc);
create index if not exists idx_payment_order on public.payment_evidence(order_id, created_at desc);
create index if not exists idx_events_order on public.order_events(order_id, created_at desc);

-- Create a profile and an empty wallet for each new auth user; never grant a role here.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id, contact_email) values (new.id, new.email)
  on conflict (id) do nothing;
  insert into public.wallet_accounts(user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_coin_center on auth.users;
create trigger on_auth_user_created_coin_center
after insert on auth.users
for each row execute function public.handle_new_user();

-- No client-side role escalation or direct balance/ledger writes.
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.wallet_accounts enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.packages enable row level security;
alter table public.orders enable row level security;
alter table public.payment_evidence enable row level security;
alter table public.inventory_lots enable row level security;
alter table public.order_events enable row level security;
alter table public.support_tickets enable row level security;
alter table public.audit_log enable row level security;

create policy "profiles_read_own" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "roles_read_own" on public.user_roles for select to authenticated using (user_id = (select auth.uid()));
create policy "wallet_read_own" on public.wallet_accounts for select to authenticated using (user_id = (select auth.uid()));
create policy "ledger_read_own" on public.wallet_ledger for select to authenticated using (user_id = (select auth.uid()));
create policy "packages_read_active" on public.packages for select to authenticated using (active = true);
create policy "orders_read_own" on public.orders for select to authenticated using (user_id = (select auth.uid()));
create policy "orders_create_own" on public.orders for insert to authenticated with check (user_id = (select auth.uid()));
create policy "payment_evidence_read_own" on public.payment_evidence for select to authenticated using (user_id = (select auth.uid()));
create policy "payment_evidence_submit_own" on public.payment_evidence for insert to authenticated with check (user_id = (select auth.uid()));
create policy "order_events_read_own" on public.order_events for select to authenticated
using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy "support_read_own" on public.support_tickets for select to authenticated using (user_id = (select auth.uid()));
create policy "support_create_own" on public.support_tickets for insert to authenticated with check (user_id = (select auth.uid()));

-- All financial/admin mutations are server-side only (service role). Authenticated clients
-- receive no INSERT/UPDATE/DELETE policy for wallets, ledger, inventory, roles, audit, or reviews.
revoke all on public.user_roles, public.wallet_ledger, public.inventory_lots, public.audit_log from anon, authenticated;
revoke insert, update, delete on public.wallet_accounts from anon, authenticated;
revoke update, delete on public.orders from anon, authenticated;
revoke update, delete on public.payment_evidence from anon, authenticated;
revoke update, delete on public.packages from anon, authenticated;
revoke update, delete on public.order_events from anon, authenticated;
