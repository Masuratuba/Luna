# Checkpoint 58 — Tool Handler Registry

## Goal
Create a deterministic server-side registry for concrete Luna tool handlers.

## Safety boundary
- Only explicitly registered tool names can execute.
- Unknown tools fail closed.
- The registry dispatches handlers but does not authorize actions.
- Guardian authorization remains mandatory in `executeActionSafely`.
- No arbitrary fallback execution is allowed.
- No outbound side effects are introduced by the registry itself.

## Next
Connect the registry to the Guardian-gated executor and add the first concrete read-only tool handler (search).
