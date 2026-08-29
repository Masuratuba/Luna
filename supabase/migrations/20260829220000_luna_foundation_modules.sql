-- LUNA foundation modules: planner, action execution metadata, tool permissions and diagnostics.
create table if not exists public.luna_plans (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  goal text not null, steps jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending','running','completed','failed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.luna_tool_permissions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  tool text not null, level text not null check (level in ('read','write','destructive')),
  requires_confirmation boolean not null default true,
  enabled boolean not null default true,
  unique(user_id, tool)
);

create index if not exists luna_plans_user_created_idx on public.luna_plans(user_id, created_at desc);
create index if not exists luna_tool_permissions_user_idx on public.luna_tool_permissions(user_id);
alter table public.luna_plans enable row level security;
alter table public.luna_tool_permissions enable row level security;
create policy "luna_plans_owner" on public.luna_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "luna_tool_permissions_owner" on public.luna_tool_permissions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
