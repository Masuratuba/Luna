# Checkpoint 49 — End-to-end action outcome hardening

Base: Checkpoint 48 (`38dad73c6ca860b86afe75fc3e14df7d1be6c96d`)

## Completed
- Corrected action persistence so failed executions emit `action.failed` instead of `action.completed` with a failed status.
- Extended the Luna event type contract to include explicit `action.failed` events.
- Preserved the fail-closed Guardian Gateway -> Action Executor boundary.
- Added regression coverage for gateway bypass, successful execution, and handler failure semantics.
- Kept the chat response contract aligned with the real executor outcome.

## Security invariants preserved
- Actions cannot execute without Guardian Gateway authorization.
- Actions cannot become `completed` unless their server-side handler succeeds.
- Failed handlers remain `failed` and are never represented as successful execution.
- Provider secrets remain server-side.

## Validation
- GitHub CI is the validation gate.
- No Vercel deployment is required for this code-only checkpoint.
