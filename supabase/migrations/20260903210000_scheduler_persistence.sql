create table if not exists public.scheduler_tasks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('reminder', 'recurring', 'follow_up')),
  status text not null check (status in ('scheduled', 'running', 'completed', 'cancelled', 'failed')),
  scheduled_for timestamptz not null,
  created_at timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  failed_at timestamptz,
  recurrence text,
  attempts integer not null default 0 check (attempts >= 0),
  requires_authorization boolean not null default true,
  authorized boolean not null default false,
  last_error text
);

create index if not exists scheduler_tasks_user_due_idx
  on public.scheduler_tasks (user_id, status, scheduled_for);

create table if not exists public.scheduler_audit_events (
  task_id text not null references public.scheduler_tasks(id) on delete cascade,
  type text not null check (type in ('task.scheduled', 'task.started', 'task.completed', 'task.cancelled', 'task.failed', 'task.retry_scheduled', 'task.recovered')),
  at timestamptz not null,
  detail text,
  primary key (task_id, type, at)
);

create index if not exists scheduler_audit_events_task_at_idx
  on public.scheduler_audit_events (task_id, at);

alter table public.scheduler_tasks enable row level security;
alter table public.scheduler_audit_events enable row level security;

create policy "scheduler tasks owner read"
  on public.scheduler_tasks for select
  using (auth.uid() = user_id);

create policy "scheduler tasks owner write"
  on public.scheduler_tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "scheduler audit owner read"
  on public.scheduler_audit_events for select
  using (exists (
    select 1 from public.scheduler_tasks t
    where t.id = scheduler_audit_events.task_id and t.user_id = auth.uid()
  ));

create policy "scheduler service role full access"
  on public.scheduler_tasks for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "scheduler audit service role full access"
  on public.scheduler_audit_events for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
