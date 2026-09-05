create table if not exists public.microsoft_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'microsoft-graph',
  microsoft_user_id text,
  account_email text,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  access_token_expires_at timestamptz not null,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.microsoft_connections enable row level security;

create policy "microsoft connections owner read"
  on public.microsoft_connections for select
  using (auth.uid() = user_id);

create policy "microsoft connections owner delete"
  on public.microsoft_connections for delete
  using (auth.uid() = user_id);

create policy "microsoft connections service role full access"
  on public.microsoft_connections for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create unique index if not exists microsoft_connections_provider_user_idx
  on public.microsoft_connections (user_id, provider);
