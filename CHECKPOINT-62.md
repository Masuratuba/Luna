# Checkpoint 62 — Durable Mail Read

## Goal
Add Luna's first durable mail capability while preserving the Checkpoint 60/61 security boundary and keeping mail read separate from mail send.

## Implemented
- Added a durable `mail_messages` store with per-user ownership and RLS.
- Added a read-only `MailReadProvider` contract.
- Added `DurableMailProvider` backed by the server-only Supabase service client.
- Added explicit `mail:read` identity scope and `mail.read` read permission.
- Mail reads are bound to the authenticated execution context's `userId`; the action input cannot select another user.
- Mail reads are bounded to at most 50 messages per call.
- Mail send is intentionally not implemented or granted by this checkpoint.
- Guardian Gateway authorization and execution budget remain mandatory before handlers run.
- Unknown tools continue to fail closed.

## Security boundary
Mail data is user-owned. Read access requires trusted identity, matching subject, `mail:read` scope, registered handler, Guardian authorization and execution budget. External content or tool input cannot grant mail permissions or change policy.

## Next mail step
Implement a separate mail-send capability only after its own authorization, confirmation and audit requirements are defined. It must never reuse `mail:read` as send authority.
