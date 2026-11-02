-- Coin Center Pro: secure account-owned profiles and pending payment requests.
-- Apply only to the Supabase project whose URL is https://uddygfixxlckkcvcdksw.supabase.co.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  coins bigint not null default 0 check (coins >= 0),
  bonus_coins bigint not null default 0 check (bonus_coins >= 0),
  total_spent numeric(14,2) not null default 0 check (total_spent >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists coins bigint not null default 0,
  add column if not exists bonus_coins bigint not null default 0,
  add column if not exists total_spent numeric(14,2) not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  username text,
  coins bigint not null check (coins > 0),
  bonus bigint not null default 0 check (bonus >= 0),
  amount_usd numeric(14,2) not null default 0,
  currency text not null default 'EGP',
  amount_local numeric(14,2) not null default 0,
  payment_method text not null,
  receipt_ref text not null,
  proof_image text,
  status text not null default 'pending_review'
    check (status in ('pending_review','payment_confirmed','fulfilled','rejected','refunded')),
  supplier_status text not null default 'not_dispatched'
    check (supplier_status in ('not_dispatched','queued','delivered','failed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  fulfilled_at timestamptz
);

alter table public.coin_transactions
  add column if not exists username text,
  add column if not exists coins bigint,
  add column if not exists bonus bigint not null default 0,
  add column if not exists amount_usd numeric(14,2) not null default 0,
  add column if not exists currency text not null default 'EGP',
  add column if not exists amount_local numeric(14,2) not null default 0,
  add column if not exists payment_method text,
  add column if not exists receipt_ref text,
  add column if not exists proof_image text,
  add column if not exists status text not null default 'pending_review',
  add column if not exists supplier_status text not null default 'not_dispatched',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists reviewed_at timestamptz,
  add column if not exists fulfilled_at timestamptz;

create index if not exists coin_transactions_user_created_idx
  on public.coin_transactions (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.coin_transactions enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own_zero_balance" on public.profiles;
create policy "profiles_insert_own_zero_balance" on public.profiles
  for insert to authenticated
  with check (
    (select auth.uid()) = id
    and coalesce(coins, 0) = 0
    and coalesce(bonus_coins, 0) = 0
    and coalesce(total_spent, 0) = 0
  );

drop policy if exists "transactions_select_own" on public.coin_transactions;
create policy "transactions_select_own" on public.coin_transactions
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "transactions_insert_pending_own" on public.coin_transactions;
create policy "transactions_insert_pending_own" on public.coin_transactions
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'pending_review'
    and supplier_status = 'not_dispatched'
  );

revoke all on public.profiles from anon, authenticated;
revoke all on public.coin_transactions from anon, authenticated;
grant select, insert on public.profiles to authenticated;
grant select on public.coin_transactions to authenticated;
grant insert (user_id, username, coins, bonus, amount_usd, currency, amount_local, payment_method, receipt_ref, proof_image)
  on public.coin_transactions to authenticated;
