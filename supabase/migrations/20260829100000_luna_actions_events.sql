-- LUNA actions, events and audit persistence
create table if not exists public.luna_actions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('task','tool','memory')),
  status text not null check (status in ('pending','approved','completed','failed')),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.luna_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.luna_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  outcome text not null check (outcome in ('allowed','blocked','success','failure')),
  risk text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists luna_actions_user_created_idx on public.luna_actions(user_id, created_at desc);
create index if not exists luna_events_user_created_idx on public.luna_events(user_id, created_at desc);
create index if not exists luna_audit_user_created_idx on public.luna_audit_log(user_id, created_at desc);

alter table public.luna_actions enable row level security;
alter table public.luna_events enable row level security;
alter table public.luna_audit_log enable row level security;

create policy "luna_actions_owner" on public.luna_actions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "luna_events_owner" on public.luna_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "luna_audit_owner" on public.luna_audit_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
