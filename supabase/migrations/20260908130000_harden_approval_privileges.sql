-- Approval rows are created and mutated only by the server-side approval store.
grant select on public.luna_approvals to authenticated;
grant insert on public.luna_approvals to authenticated;
revoke update, delete on public.luna_approvals from authenticated;
