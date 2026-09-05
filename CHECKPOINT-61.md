# Checkpoint 61 — Web Capability

Status: implemented in the existing provider boundary.

- Server-side OpenAI web-search provider remains the web capability.
- Search results are normalized to title/url/snippet.
- Only HTTP(S) citation URLs are accepted.
- Duplicate URLs are removed and result count is bounded.
- Provider execution remains behind the Guardian Gateway and trusted identity/scope checks.
- No browser-side API secret is introduced.

Verification coverage exists in `lib/providers/providers.test.ts` for citation extraction, URL validation, limits, and missing-query fail-closed behavior.
