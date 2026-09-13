-- Restore explicit service_role privileges for the server-side LUNA chat client.
-- The service role bypasses RLS, but it still needs table privileges.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.conversations to service_role;
grant select, insert, update, delete on public.messages to service_role;
grant select, insert, update, delete on public.memories to service_role;
grant select, insert, update, delete on public.projects to service_role;
grant select, insert, update, delete on public.tasks to service_role;
grant select, insert, update, delete on public.tool_connections to service_role;
grant select, insert, update, delete on public.luna_actions to service_role;
grant select, insert, update, delete on public.luna_events to service_role;
grant select, insert, update, delete on public.luna_audit_log to service_role;
