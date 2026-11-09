-- Add covering indexes for foreign keys identified by the Supabase performance advisor.
create index if not exists idx_automations_user_id on public.automations (user_id);
create index if not exists idx_luna_agent_runs_agent_id on public.luna_agent_runs (agent_id);
create index if not exists idx_luna_shop_ledger_user_id on public.luna_shop_ledger (user_id);
create index if not exists idx_luna_shop_runs_user_id on public.luna_shop_runs (user_id);
create index if not exists idx_tasks_project_id on public.tasks (project_id);
