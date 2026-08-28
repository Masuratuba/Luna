-- LUNA 0.4 runtime additions: durable memory, automations, file metadata.
create table if not exists automations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  prompt text not null,
  schedule text not null,
  enabled boolean not null default true,
  next_run_at timestamptz,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table automations enable row level security;
alter table files enable row level security;

create policy if not exists "automations_owner" on automations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists "files_owner" on files for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists automations_due_idx on automations (enabled, next_run_at);
create index if not exists files_user_created_idx on files (user_id, created_at desc);
create index if not exists memories_user_updated_idx on memories (user_id, updated_at desc);
create index if not exists messages_conversation_created_idx on messages (conversation_id, created_at asc);

-- Private storage bucket for user files. Storage policies restrict access to the
-- first path segment, which is the authenticated user's UUID.
insert into storage.buckets (id, name, public)
values ('luna-files', 'luna-files', false)
on conflict (id) do nothing;

create policy if not exists "luna_files_select" on storage.objects
for select to authenticated
using (bucket_id = 'luna-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy if not exists "luna_files_insert" on storage.objects
for insert to authenticated
with check (bucket_id = 'luna-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy if not exists "luna_files_update" on storage.objects
for update to authenticated
using (bucket_id = 'luna-files' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'luna-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy if not exists "luna_files_delete" on storage.objects
for delete to authenticated
using (bucket_id = 'luna-files' and (storage.foldername(name))[1] = auth.uid()::text);
