# LUNA GUARD v0.1

LUNA GUARD is the server-side security boundary for LUNA actions.

## Rules

- Authentication is required before guarded actions.
- SAFE requests may proceed automatically.
- PROTECTED requests are explicitly marked for future tool authorization.
- CRITICAL requests are denied until an explicit confirmation flow exists.
- Provider secrets never enter the browser.
- The Guard runs on the server and cannot be bypassed by UI code.

## Risk levels

- SAFE: normal conversation and read-only reasoning.
- PROTECTED: memory writes, task creation and tool-related actions.
- CRITICAL: deletion, sending/transferring data, or credential/secret requests.

## Future expansion

The Guard is intentionally isolated so later modules can add permissions, confirmation tokens, rate limits, audit events and per-tool policies without changing the chat contract.
