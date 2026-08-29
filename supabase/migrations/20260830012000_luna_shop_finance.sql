create table if not exists public.luna_shop_finance_config (
  user_id uuid primary key references auth.users(id) on delete cascade,
  target_profit_eur numeric not null default 15 check (target_profit_eur >= 0),
  target_window_hours numeric not null default 24 check (target_window_hours > 0),
  max_loss_eur numeric not null default 10 check (max_loss_eur >= 0),
  max_transaction_eur numeric not null default 25 check (max_transaction_eur > 0),
  max_daily_spend_eur numeric not null default 50 check (max_daily_spend_eur >= 0),
  require_approval_for_payouts boolean not null default true,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.luna_shop_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_type text not null check (entry_type in ('sale','cost','fee','payout')),
  amount_eur numeric not null check (amount_eur >= 0),
  reference text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.luna_shop_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'ready' check (status in ('ready','running','target_reached','deactivated')),
  net_profit_eur numeric not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

alter table public.luna_shop_finance_config enable row level security;
alter table public.luna_shop_ledger enable row level security;
alter table public.luna_shop_runs enable row level security;

create policy "luna_shop_finance_owner" on public.luna_shop_finance_config for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "luna_shop_ledger_owner" on public.luna_shop_ledger for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "luna_shop_runs_owner" on public.luna_shop_runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
