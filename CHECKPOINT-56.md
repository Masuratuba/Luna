# Checkpoint 56 — Durable Scheduler Persistence

## Goal
Give Luna's scheduler durable storage so scheduled work survives process restarts instead of existing only in runtime memory.

## Included
- Supabase schema for `scheduler_tasks`.
- Supabase audit table for scheduler lifecycle events.
- Row-level security for user-owned scheduler data.
- Server-only service-role persistence adapter.
- Cross-user state rejection in the persistence boundary.
- Idempotent upserts for tasks and audit events.

## Safety boundary
- This checkpoint does not add autonomous outbound actions.
- It does not bypass the Guardian Gateway.
- It does not send messages or write calendars.
- Scheduler execution remains behind the existing scheduler runtime and Guardian-gated executor.

## Operational requirement
The migration `supabase/migrations/20260903210000_scheduler_persistence.sql` must be applied to the connected Supabase project before the persistence adapter can load or save scheduler state.

## Next
After this checkpoint: connect the durable persistence adapter to a controlled scheduler trigger/worker and then move to concrete tool handlers (Web, Mail, Calendar, Files) behind the existing Guardian boundary.
