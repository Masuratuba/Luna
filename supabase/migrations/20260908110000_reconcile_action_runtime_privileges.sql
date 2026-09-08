-- Action state is updated by the authenticated chat executor after real execution.
grant select, insert, update on public.luna_actions to authenticated;
revoke delete on public.luna_actions from authenticated;

-- Events and audit entries are append-only for authenticated clients.
grant select, insert on public.luna_events to authenticated;
grant select, insert on public.luna_audit_log to authenticated;
revoke update, delete on public.luna_events from authenticated;
revoke update, delete on public.luna_audit_log from authenticated;
