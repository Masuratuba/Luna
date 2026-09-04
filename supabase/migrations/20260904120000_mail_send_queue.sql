create table if not exists public.mail_send_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  to jsonb not null,
  subject text not null,
  body_text text not null,
  thread_id text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists mail_send_queue_user_created_idx
  on public.mail_send_queue (user_id, created_at desc);

alter table public.mail_send_queue enable row level security;

create policy "mail send queue owner insert"
  on public.mail_send_queue
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "mail send queue owner select"
  on public.mail_send_queue
  for select
  to authenticated
  using (user_id = auth.uid());
