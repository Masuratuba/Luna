# Checkpoint 57 — Controlled Scheduler Trigger

## Goal
Expose one controlled server-side trigger for the durable scheduler without turning the trigger into an autonomous side-effect engine.

## Included
- `runControlledSchedulerTrigger()` wrapper around the existing runtime.
- Protected internal POST endpoint at `/api/internal/scheduler/tick`.
- Server-only cron secret authentication.
- Explicit user scope via `x-luna-user-id`.
- Node runtime for server-side Supabase/service-role access.
- Fail-closed placeholder handler until concrete tool handlers are installed.

## Safety boundary
- No Guardian bypass.
- No outbound message/calendar/API side effects from the trigger itself.
- Missing cron secret rejects the request.
- Missing user scope rejects the request.
- The endpoint's placeholder handler intentionally fails closed rather than pretending scheduled work executed.

## Operational requirement
Set `SCHEDULER_CRON_SECRET` before enabling an external scheduler/cron caller. A concrete handler registry must replace the placeholder before production task execution.

## Next
Connect the trigger to a controlled deployment scheduler (for example a platform cron) and then implement concrete Guardian-gated tool handlers one capability at a time.