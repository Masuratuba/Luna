# Checkpoint 60 — Trusted Identity, Scope, Approval & Execution Bounds

## Goal
Create a complete reusable security block around action execution: verified identity, explicit scope, single-purpose approval records and bounded execution.

## Implemented
- Added `TrustedUserContext` for verified user/service identities.
- Extended verified auth assertions with explicit scopes.
- Added subject matching helpers and wildcard scopes (`luna:*`, `*`).
- Guardian Gateway derives role/authentication from the verified identity when present.
- `executeActionSafely` requires a trusted identity whose subject matches `context.userId`.
- Action execution requires a scope appropriate to the action/tool.
- Trusted admin contexts remain verifier-created and subject-bound.
- Added single-purpose, expiring approval records with unique tokens, action/user binding and consumed state.
- Added a shared request-scoped `ExecutionBudget` with action and tool-call limits.
- Scheduler execution now supplies an explicit execution budget.
- Regression tests cover identity mismatch, scope validation, approval reuse/expiry and execution limits.

## Scope rules
- `search` → `search:read`
- `memory.read` → `memory:read`
- `memory.write` → `memory:write`
- `task.create` / task actions → `task:create`
- Other tools default to `<tool>:execute`
- `luna:*` or `*` may be used when the external identity provider intentionally grants broad Luna scope.

## Approval rules
- Approval is bound to exactly one `userId` and one action string.
- Approval expires after a short TTL by default.
- A consumed approval cannot be reused.
- The approval record retains timestamps/status for audit persistence.

## Execution bounds
- Every executor call receives a shared `ExecutionBudget`.
- Default limits: 20 tool calls and 30 total actions per request-scoped budget.
- A tool call consumes both a tool-call slot and an action slot.
- The budget must be reused across an agent/tool loop; creating a new budget per call intentionally resets the budget and must therefore be avoided by orchestrators.

## Safety boundary
The executor no longer treats `authenticated: true` or an arbitrary `userId` as sufficient proof of identity. Identity must come from the trusted verifier, the canonical subject must match the execution user, and the action must have the required scope before its handler can run.

## Production integration still required
The production authentication/session adapter must construct verified assertions containing the real subject, role, issuer, expiry, nonce and explicit scopes. No new secret is required by this checkpoint; the issuer remains server-side configuration.

Approval records also need durable persistence before they can serve as a cross-process audit source. The core lifecycle and single-use semantics are now defined and tested.

## Deliberately deferred
Prompt-injection/untrusted-content handling should be implemented at the concrete external-data handlers (Web/Mail/Calendar/Files) once those handlers exist. Doing it here without those data boundaries would only create a false sense of protection.
