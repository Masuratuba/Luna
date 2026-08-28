-- Fix chat persistence for databases where 001_luna_core.sql
-- created messages before the per-user user_id column was introduced.

alter table public.messages
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

update public.messages m
set user_id = c.user_id
from public.conversations c
where m.conversation_id = c.id
  and m.user_id is null;

alter table public.messages
  alter column user_id set not null;

create index if not exists messages_user_created_idx
  on public.messages(user_id, created_at);

alter table public.messages enable row level security;

drop policy if exists "messages_owner" on public.messages;
drop policy if exists "messages_select_own" on public.messages;
drop policy if exists "messages_insert_own" on public.messages;
drop policy if exists "messages_delete_own" on public.messages;

create policy "messages_owner" on public.messages
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
