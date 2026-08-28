-- LUNA 0.1 — persistent conversations and messages
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

create index if not exists conversations_user_updated_idx on public.conversations(user_id, updated_at desc);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at);
create index if not exists messages_user_idx on public.messages(user_id);

create or replace function public.set_conversation_updated_at()
returns trigger language plpgsql as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
after insert or update on public.messages
for each row execute function public.set_conversation_updated_at();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "conversations_select_own" on public.conversations for select to authenticated using (user_id = auth.uid());
create policy "conversations_insert_own" on public.conversations for insert to authenticated with check (user_id = auth.uid());
create policy "conversations_update_own" on public.conversations for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "conversations_delete_own" on public.conversations for delete to authenticated using (user_id = auth.uid());

create policy "messages_select_own" on public.messages for select to authenticated using (user_id = auth.uid());
create policy "messages_insert_own" on public.messages for insert to authenticated with check (user_id = auth.uid());
create policy "messages_delete_own" on public.messages for delete to authenticated using (user_id = auth.uid());
