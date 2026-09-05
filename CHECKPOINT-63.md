# Checkpoint 63 — Mail Send Capability

Status: implemented with explicit safety gates.

- Added Microsoft Graph `sendMail` support.
- Sending requires complete recipient, subject and body input.
- Sending is exposed only through `action` agent capability `mail.send` in execute mode.
- The tool is treated as destructive/confirmation-required by Luna permissions.
- The API additionally requires `approved: true` and a non-empty confirmation token before execution.
- Provider errors fail closed; no send is attempted without the required authorization state.
- No real email was sent during repository verification; tests use a mocked fetch boundary.

Required Microsoft Graph permission: `Mail.Send`.
