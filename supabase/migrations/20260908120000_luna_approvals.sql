create table if not exists public.luna_approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action_key text not null,
  reason text not null,
  token_hash text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','consumed','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  approved_at timestamptz,
  consumed_at timestamptz
);

create index if not exists luna_approvals_user_status_idx on public.luna_approvals(user_id, status, expires_at);
create unique index if not exists luna_approvals_token_hash_idx on public.luna_approvals(token_hash);

alter table public.luna_approvals enable row level security;

create policy "luna approvals owner" on public.luna_approvals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on public.luna_approvals to authenticated;
revoke delete on public.luna_approvals from authenticated;
