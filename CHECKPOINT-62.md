# Checkpoint 62 — Mail Read Capability

Status: implemented.

- Added a server-side Microsoft Graph mail provider.
- Supports inbox/sent search and reading a message by ID.
- Access token is server-only and never exposed to the client.
- Mail reads are routed through `research` with capability `mail.read` and read mode.
- Provider responses are normalized to a minimal safe mail shape.
- Missing credentials, invalid input, provider errors and timeouts fail closed.

Required Microsoft Graph delegated permission: `Mail.Read` (or an appropriately scoped application permission where applicable).
