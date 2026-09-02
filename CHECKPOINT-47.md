# Checkpoint 47 — Chat boundary hardening

Base: Checkpoint 46 (`a9bf86fd7bc21265adac8f3e24ad60f49280ce50`)

## Completed
- Read-only research requests are allowed at the chat guard decision layer.
- Chat research is routed through the existing `research -> search -> provider` capability boundary.
- Search execution is reported as performed only when verified provider results are returned.
- Chat input is bounded to 20,000 characters.
- Generic chat API errors no longer expose provider/internal error messages to clients.
- Regression tests cover read-only research and protected task guard semantics.
- PR #12 merged to `main` after successful CI #91.

## Security invariants preserved
- Critical/protected tool actions remain fail-closed in `checkGuard`.
- Agent capability access is still checked before research provider use.
- Provider secrets remain server-side.
- No Vercel deployment was required for this code-only change.

## Main commit
`4a91de3fa6517218a47dbce6a53ddfc2475b6af8`
