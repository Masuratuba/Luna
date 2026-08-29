create table if not exists public.luna_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null default '',
  run_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','fired','cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists luna_reminders_due_idx on public.luna_reminders(status, run_at);
create index if not exists luna_reminders_user_idx on public.luna_reminders(user_id, run_at desc);
alter table public.luna_reminders enable row level security;
create policy "luna_reminders_owner" on public.luna_reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
