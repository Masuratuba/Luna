-- The Microsoft connection status endpoint reads the current user's connection.
-- RLS keeps rows scoped to auth.uid(); authenticated needs the table-level SELECT grant too.
GRANT SELECT ON TABLE public.microsoft_connections TO authenticated;
