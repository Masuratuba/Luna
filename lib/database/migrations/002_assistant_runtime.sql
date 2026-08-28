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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'automations' AND policyname = 'automations_owner') THEN
    CREATE POLICY "automations_owner" ON automations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'files' AND policyname = 'files_owner') THEN
    CREATE POLICY "files_owner" ON files FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

create index if not exists automations_due_idx on automations (enabled, next_run_at);
create index if not exists files_user_created_idx on files (user_id, created_at desc);
create index if not exists memories_user_updated_idx on memories (user_id, updated_at desc);
create index if not exists messages_conversation_created_idx on messages (conversation_id, created_at asc);

insert into storage.buckets (id, name, public)
values ('luna-files', 'luna-files', false)
on conflict (id) do nothing;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'luna_files_select') THEN
    CREATE POLICY "luna_files_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'luna-files' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'luna_files_insert') THEN
    CREATE POLICY "luna_files_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'luna-files' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'luna_files_update') THEN
    CREATE POLICY "luna_files_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'luna-files' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'luna-files' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'luna_files_delete') THEN
    CREATE POLICY "luna_files_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'luna-files' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;
