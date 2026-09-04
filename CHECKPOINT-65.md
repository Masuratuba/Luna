# Checkpoint 65 — Mail Send Execution + Audit

## Goal
Connect the authorized `mail.send` action to Luna's durable outbound queue and record execution outcomes in a durable audit store, without connecting a live external mail transport.

## Implemented
- Added a dedicated durable `AuditProvider` and `audit_events` store.
- Added RLS for owner-scoped audit reads/inserts.
- Registered the mail-send and audit providers in the server provider registry.
- Registered `mail.send` as an executable server-side handler.
- Mail send uses `context.userId`; action input cannot select another user.
- Successful mail-send execution queues the message and records a `queued` audit event.
- Failed mail-send execution attempts to record a `failed` audit event while preserving the original execution error.
- Existing Guardian Gateway, trusted identity, dedicated `mail:send` scope, confirmation and Execution Budget checks remain mandatory before the handler runs.
- No live external mail transport is connected.

## Security boundary
The handler does not bypass authorization. It is reachable only through the existing action executor after gateway authorization, trusted identity/subject validation, dedicated scope validation, Guardian checks, action policy and execution budget checks.

## Next step
Validate the complete execution/audit path in CI, then separately design and implement the live mail transport boundary. The live transport must not weaken the existing authorization, confirmation, identity or audit controls.
