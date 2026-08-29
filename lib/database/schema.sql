-- LUNA 0.1 database schema
-- PostgreSQL / Supabase
-- Canonical schema mirrors the versioned migrations in supabase/migrations.

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Neue Unterhaltung',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('personal', 'preference', 'project', 'decision', 'fact', 'instruction')),
  content text not null,
  importance numeric not null default 0.5 check (importance >= 0 and importance <= 1),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'completed', 'cancelled')),
  priority integer not null default 3 check (priority between 1 and 5),
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tool_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  status text not null default 'disconnected' check (status in ('connected', 'disconnected', 'error')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists conversations_user_updated_idx on conversations(user_id, updated_at desc);
create index if not exists messages_conversation_created_idx on messages(conversation_id, created_at);
create index if not exists messages_user_created_idx on messages(user_id, created_at);
create index if not exists memories_user_idx on memories(user_id);
create index if not exists projects_user_idx on projects(user_id);
create index if not exists tasks_user_status_idx on tasks(user_id, status);
create index if not exists tool_connections_user_idx on tool_connections(user_id);

alter table profiles enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table memories enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table tool_connections enable row level security;

create policy "profiles_owner" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "conversations_owner" on conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "messages_owner" on messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "memories_owner" on memories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "projects_owner" on projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tasks_owner" on tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "connections_owner" on tool_connections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
