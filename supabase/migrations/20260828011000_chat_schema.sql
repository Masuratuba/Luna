-- LUNA 0.1 — Chat persistence

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

create index if not exists conversations_user_updated_idx
  on public.conversations(user_id, updated_at desc);
create index if not exists messages_conversation_created_idx
  on public.messages(conversation_id, created_at);
create index if not exists messages_user_created_idx
  on public.messages(user_id, created_at);

create trigger conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "conversations_select_own" on public.conversations
for select to authenticated using (user_id = auth.uid());
create policy "conversations_insert_own" on public.conversations
for insert to authenticated with check (user_id = auth.uid());
create policy "conversations_update_own" on public.conversations
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "conversations_delete_own" on public.conversations
for delete to authenticated using (user_id = auth.uid());

create policy "messages_select_own" on public.messages
for select to authenticated using (user_id = auth.uid());
create policy "messages_insert_own" on public.messages
for insert to authenticated with check (user_id = auth.uid());
create policy "messages_delete_own" on public.messages
for delete to authenticated using (user_id = auth.uid());
