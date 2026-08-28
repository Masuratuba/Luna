-- LUNA 0.1 — Chat persistence hardening
-- This migration is intentionally idempotent because 001_luna_core.sql already
-- creates the core chat tables and their owner policies.

create extension if not exists pgcrypto;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Neue Unterhaltung',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

-- 001_luna_core.sql created messages without user_id. Add and backfill it
-- before creating the per-user RLS policies below.
alter table public.messages
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

update public.messages m
set user_id = c.user_id
from public.conversations c
where m.conversation_id = c.id
  and m.user_id is null;

alter table public.messages
  alter column user_id set not null;

create index if not exists conversations_user_updated_idx
  on public.conversations(user_id, updated_at desc);
create index if not exists messages_conversation_created_idx
  on public.messages(conversation_id, created_at);
create index if not exists messages_user_created_idx
  on public.messages(user_id, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists conversations_updated_at on public.conversations;
create trigger conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "conversations_select_own" on public.conversations;
create policy "conversations_select_own" on public.conversations
for select to authenticated using (user_id = auth.uid());

drop policy if exists "conversations_insert_own" on public.conversations;
create policy "conversations_insert_own" on public.conversations
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "conversations_update_own" on public.conversations;
create policy "conversations_update_own" on public.conversations
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "conversations_delete_own" on public.conversations;
create policy "conversations_delete_own" on public.conversations
for delete to authenticated using (user_id = auth.uid());

drop policy if exists "messages_owner" on public.messages;
drop policy if exists "messages_select_own" on public.messages;
drop policy if exists "messages_insert_own" on public.messages;
drop policy if exists "messages_delete_own" on public.messages;

create policy "messages_owner" on public.messages
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
