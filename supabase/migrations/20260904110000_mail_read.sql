-- LUNA 0.1 — Durable mail read capability
-- Mail read and mail send are intentionally separate capabilities.

create extension if not exists pgcrypto;

create table if not exists public.mail_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_message_id text not null,
  thread_id text,
  from_address text not null,
  to jsonb not null default '[]'::jsonb,
  subject text not null default '',
  body_text text not null default '',
  received_at timestamptz not null,
  unread boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id, provider_message_id)
);

create index if not exists mail_messages_user_received_idx
  on public.mail_messages(user_id, received_at desc);
create index if not exists mail_messages_user_unread_idx
  on public.mail_messages(user_id, unread, received_at desc);

alter table public.mail_messages enable row level security;

drop policy if exists "mail_messages_select_own" on public.mail_messages;
create policy "mail_messages_select_own" on public.mail_messages
for select to authenticated using (user_id = auth.uid());
