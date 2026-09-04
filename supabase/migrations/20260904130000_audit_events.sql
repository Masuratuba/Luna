create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  action text not null,
  outcome text not null check (outcome in ('queued', 'failed')),
  resource_id text,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.audit_events enable row level security;

create policy "audit_events_owner_select"
on public.audit_events
for select
using (user_id = auth.uid()::text);

create policy "audit_events_owner_insert"
on public.audit_events
for insert
to authenticated
with check (user_id = auth.uid()::text);
