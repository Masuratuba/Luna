# Checkpoint 64 — Integration, Policy & Tests

Status: implemented.

## Integrated
- Web capability is preserved through the existing OpenAI search provider.
- Microsoft Graph mail provider is registered in the provider registry.
- `/api/mail` exposes guarded `search`, `read`, and `send` operations.
- Mail read routes to the research agent; mail send routes to the action agent.
- Mail send is confirmation-gated and requires a non-empty confirmation token.
- Microsoft Graph credentials remain server-side via `MICROSOFT_GRAPH_ACCESS_TOKEN`.

## Verification
- Added provider tests for mail validation, Graph request behavior, and missing-token fail-closed behavior.
- Added agent-policy/Guardian regression tests for mail read vs. mail send.
- Existing web/provider regression coverage remains in place.
- No live mailbox access or real email send was performed by the repository tests.

## External setup still required
The implementation is code-complete, but live mail functionality requires a Microsoft identity integration that supplies a valid Graph access token with the appropriate permissions (`Mail.Read` for reading and `Mail.Send` for sending). This is intentionally not hard-coded into the repository.
