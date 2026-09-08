-- Durable approvals are managed exclusively by the server-side service-role store.
revoke insert, update, delete on public.luna_approvals from authenticated;
grant select on public.luna_approvals to authenticated;
