-- LUNA 0.1 — Initial database schema
-- Architecture: Frontend → API → Luna Core → Memory / Tools → PostgreSQL
-- All application data is owned by auth.users and protected with RLS.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.luna_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.luna_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_key text not null,
  memory_value jsonb not null,
  category text not null default 'general',
  importance smallint not null default 3 check (importance between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, memory_key)
);

create table if not exists public.luna_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null default '',
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.luna_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz not null,
  timezone text not null default 'UTC',
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.luna_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'active' check (status in ('draft', 'active', 'completed', 'archived')),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table if not exists public.luna_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists luna_memory_user_idx on public.luna_memory(user_id);
create index if not exists luna_notes_user_idx on public.luna_notes(user_id);
create index if not exists luna_reminders_user_due_idx on public.luna_reminders(user_id, due_at);
create index if not exists luna_plans_user_idx on public.luna_plans(user_id);
create index if not exists luna_files_user_idx on public.luna_files(user_id);

create trigger luna_profile_updated_at
before update on public.luna_profile
for each row execute function public.set_updated_at();

create trigger luna_memory_updated_at
before update on public.luna_memory
for each row execute function public.set_updated_at();

create trigger luna_notes_updated_at
before update on public.luna_notes
for each row execute function public.set_updated_at();

create trigger luna_reminders_updated_at
before update on public.luna_reminders
for each row execute function public.set_updated_at();

create trigger luna_plans_updated_at
before update on public.luna_plans
for each row execute function public.set_updated_at();

create trigger luna_files_updated_at
before update on public.luna_files
for each row execute function public.set_updated_at();

alter table public.luna_profile enable row level security;
alter table public.luna_memory enable row level security;
alter table public.luna_notes enable row level security;
alter table public.luna_reminders enable row level security;
alter table public.luna_plans enable row level security;
alter table public.luna_files enable row level security;

create policy "profile_select_own" on public.luna_profile
for select to authenticated using (user_id = auth.uid());
create policy "profile_insert_own" on public.luna_profile
for insert to authenticated with check (user_id = auth.uid());
create policy "profile_update_own" on public.luna_profile
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "profile_delete_own" on public.luna_profile
for delete to authenticated using (user_id = auth.uid());

create policy "memory_select_own" on public.luna_memory
for select to authenticated using (user_id = auth.uid());
create policy "memory_insert_own" on public.luna_memory
for insert to authenticated with check (user_id = auth.uid());
create policy "memory_update_own" on public.luna_memory
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "memory_delete_own" on public.luna_memory
for delete to authenticated using (user_id = auth.uid());

create policy "notes_select_own" on public.luna_notes
for select to authenticated using (user_id = auth.uid());
create policy "notes_insert_own" on public.luna_notes
for insert to authenticated with check (user_id = auth.uid());
create policy "notes_update_own" on public.luna_notes
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notes_delete_own" on public.luna_notes
for delete to authenticated using (user_id = auth.uid());

create policy "reminders_select_own" on public.luna_reminders
for select to authenticated using (user_id = auth.uid());
create policy "reminders_insert_own" on public.luna_reminders
for insert to authenticated with check (user_id = auth.uid());
create policy "reminders_update_own" on public.luna_reminders
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reminders_delete_own" on public.luna_reminders
for delete to authenticated using (user_id = auth.uid());

create policy "plans_select_own" on public.luna_plans
for select to authenticated using (user_id = auth.uid());
create policy "plans_insert_own" on public.luna_plans
for insert to authenticated with check (user_id = auth.uid());
create policy "plans_update_own" on public.luna_plans
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "plans_delete_own" on public.luna_plans
for delete to authenticated using (user_id = auth.uid());

create policy "files_select_own" on public.luna_files
for select to authenticated using (user_id = auth.uid());
create policy "files_insert_own" on public.luna_files
for insert to authenticated with check (user_id = auth.uid());
create policy "files_update_own" on public.luna_files
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "files_delete_own" on public.luna_files
for delete to authenticated using (user_id = auth.uid());
