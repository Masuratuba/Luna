-- Runtime privilege reconciliation.
-- RLS remains the row-level boundary; table privileges prevent clients from rewriting audit history.

grant usage on schema public to authenticated;
grant select on public.microsoft_connections to authenticated;

grant select, insert on public.luna_actions to authenticated;
grant select, insert on public.luna_events to authenticated;
grant select, insert on public.luna_audit_log to authenticated;
revoke update, delete on public.luna_actions from authenticated;
revoke update, delete on public.luna_events from authenticated;
revoke update, delete on public.luna_audit_log from authenticated;
