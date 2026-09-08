-- Authenticated users may read only their own Microsoft connection row.
-- Row-level security remains the ownership boundary; this grant only enables SELECT.
grant select on table public.microsoft_connections to authenticated;
