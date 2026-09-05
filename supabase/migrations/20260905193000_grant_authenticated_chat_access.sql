-- LUNA — grant table privileges required by the authenticated chat API.
-- RLS policies restrict rows; PostgreSQL table privileges are still required.

grant usage on schema public to authenticated;

grant select, insert, update on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert on public.memories to authenticated;
grant select, insert, update on public.tasks to authenticated;
grant select, insert, update on public.luna_actions to authenticated;
grant select, insert, update on public.luna_events to authenticated;
grant select, insert, update on public.luna_audit_log to authenticated;
