-- LUNA Memory 1.0: indexes, timestamps and authenticated grants.
-- Intentionally limited to tables from the canonical core/foundation schemas.

create index if not exists memories_user_updated_idx
  on public.memories(user_id, updated_at desc);
create index if not exists memories_user_type_idx
  on public.memories(user_id, type);

create or replace function public.set_memory_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists memories_updated_at on public.memories;
create trigger memories_updated_at
before update on public.memories
for each row execute function public.set_memory_updated_at();

-- RLS policies already restrict these rows to auth.uid(). PostgreSQL grants are
-- still required for PostgREST/Supabase client access.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.memories to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.tool_connections to authenticated;
grant select, insert, update, delete on public.luna_plans to authenticated;
grant select, insert, update, delete on public.luna_tool_permissions to authenticated;
