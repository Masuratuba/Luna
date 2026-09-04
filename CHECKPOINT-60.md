# Checkpoint 60 — Trusted Identity & Scope Binding

## Goal
Make action execution bind to a verified user/service identity and explicit scopes instead of trusting caller-supplied authentication flags or user IDs.

## Implemented
- Added `TrustedUserContext` for verified non-admin identities.
- Extended verified auth assertions with explicit scopes.
- Added subject matching helpers and wildcard scopes (`luna:*`, `*`).
- Guardian Gateway derives role/authentication from the verified identity when present.
- `executeActionSafely` now requires a trusted identity whose subject matches `context.userId`.
- Action execution now requires a scope appropriate to the action/tool.
- Trusted admin contexts remain verifier-created and subject-bound.
- Added regression tests for missing identity, subject mismatch, identity verification and scope validation.

## Scope rules
- `search` → `search:read`
- `memory.read` → `memory:read`
- `memory.write` → `memory:write`
- `task.create` / task actions → `task:create`
- Other tools default to `<tool>:execute`
- `luna:*` or `*` may be used by a trusted identity when the external identity provider intentionally grants broad Luna scope.

## Safety boundary
The executor no longer treats `authenticated: true` or an arbitrary `userId` as sufficient proof of identity. Identity must come from the trusted verifier, and the canonical subject must match the execution user.

## Required external integration
The production authentication adapter must populate `TrustedAuthAssertion` with the real authenticated subject, role, issuer, expiry, nonce and explicit scopes. No new secret is required by this checkpoint; the issuer is still supplied to the server-side verifier.

## Next candidate hardening
- Make approval tokens auditable and single-purpose.
- Add per-request/tool-call limits against runaway loops.
- Add prompt-injection/untrusted-content rules at external-data handlers.
- Connect the verifier to the application's real authentication/session provider.
