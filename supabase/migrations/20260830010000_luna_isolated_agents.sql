-- Isolated agent registry and capability grants.
-- Grants are deny-by-default; application code must enforce them at the server tool gateway.
create table if not exists public.luna_agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_key text not null,
  name text not null,
  isolated boolean not null default true,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id, agent_key)
);

create table if not exists public.luna_agent_access_grants (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.luna_agents(id) on delete cascade,
  capability text not null,
  mode text not null check (mode in ('read','write','execute')),
  requires_approval boolean not null default true,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(agent_id, capability)
);

create table if not exists public.luna_agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.luna_agents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  task text not null,
  status text not null default 'queued' check (status in ('queued','running','blocked','completed','failed')),
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists luna_agents_user_idx on public.luna_agents(user_id);
create index if not exists luna_agent_grants_agent_idx on public.luna_agent_access_grants(agent_id);
create index if not exists luna_agent_runs_user_idx on public.luna_agent_runs(user_id, created_at desc);

alter table public.luna_agents enable row level security;
alter table public.luna_agent_access_grants enable row level security;
alter table public.luna_agent_runs enable row level security;

create policy "luna_agents_owner" on public.luna_agents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "luna_agent_grants_owner" on public.luna_agent_access_grants for all
  using (exists (select 1 from public.luna_agents a where a.id = agent_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.luna_agents a where a.id = agent_id and a.user_id = auth.uid()));
create policy "luna_agent_runs_owner" on public.luna_agent_runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
