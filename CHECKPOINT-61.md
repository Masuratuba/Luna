# Checkpoint 61 — Real Web Capability

## Goal
Move Luna from capability definitions toward real server-side abilities while preserving the Checkpoint 60 security boundary.

## Implemented
- `search` is a real OpenAI web-search-backed capability.
- Added `web.fetch`, a real HTTP(S) fetch capability for external pages and text/JSON resources.
- Web fetch rejects credential-bearing URLs and private/local address targets.
- Redirects are manually validated so a public URL cannot redirect into a private network target.
- Response size, timeout and content-type limits are enforced.
- HTML executable blocks (`script`, `style`, `noscript`) are removed before content is returned.
- External web content is explicitly marked `untrusted` and the tool output warns that instructions inside external content are data, not Luna policy or authorization.
- `web.fetch` is a read-only capability with an explicit `web:read` identity scope.
- Guardian and action policy remain mandatory gates before the handler runs.

## Security boundary
Web content can inform an answer, but it cannot grant identity, scopes, approval, permissions, policy changes or tool execution authority.

## Next real capabilities
1. Durable Mail capability with explicit read/send separation.
2. Calendar capability with read/create/update separation and confirmation for external changes.
3. Files capability with bounded reads and untrusted-content handling.
4. Connect those capabilities to the same provider registry, Guardian Gateway, identity scopes and execution budget.
