create table if not exists public.scheduler_deliveries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.scheduler_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  status text not null default 'queued' check (status in ('queued', 'recorded')),
  created_at timestamptz not null default now(),
  recorded_at timestamptz not null default now(),
  unique (task_id)
);

create index if not exists scheduler_deliveries_user_created_idx
  on public.scheduler_deliveries (user_id, created_at desc);

alter table public.scheduler_deliveries enable row level security;

drop policy if exists "scheduler deliveries own rows" on public.scheduler_deliveries;
create policy "scheduler deliveries own rows"
  on public.scheduler_deliveries
  for select
  to authenticated
  using (auth.uid() = user_id);

grant select on public.scheduler_deliveries to authenticated;
