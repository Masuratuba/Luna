# LUNA GUARD v1.0

LUNA GUARD is LUNA's independent server-side security boundary. It is a policy module, not an agent.

## Design principles

- **Independent:** the Guard does not call, depend on, or accept policy changes from agents.
- **Fail closed:** missing authentication, unknown tools, unknown actions, or missing confirmation block the operation.
- **Server-side:** browser/UI code cannot bypass the Guard.
- **No execution:** the Guard only decides; execution remains in the executor/provider layer.
- **No secrets:** provider secrets, API keys, private keys and credentials are never exposed to agents or browser code.
- **Explicit approval:** protected operations require approval; critical operations additionally require a confirmation token.
- **Audit-ready:** every guard result can be emitted as a `guard.checked` event by the surrounding core/audit layer.

## Risk levels

- **SAFE:** normal read-only reasoning and safe operations.
- **PROTECTED:** memory writes, task creation and controlled changes; approval is required.
- **CRITICAL:** deletion, external transfer/send, wallet operations, payments, credentials/secrets, unknown tools; blocked unless explicitly confirmed.

## Guard responsibilities

1. Authenticate the caller context.
2. Classify the requested action by risk.
3. Enforce the tool allow/deny boundary.
4. Require explicit approval for protected operations.
5. Require approval plus a confirmation token for critical operations.
6. Fail closed on unknown or malformed requests.
7. Prevent agents from granting themselves permissions.
8. Provide deterministic decisions for diagnostics and audit.

## Execution boundary

The intended flow is:

`request → Guard → approval (when required) → action executor → provider`

The Guard must remain before the executor. Agents may propose actions, but they do not authorize or execute them.

## Financial boundary

Wallet, transfer, withdrawal, signing, payment and credential operations are classified as critical by default. A future wallet gateway may be connected behind this boundary without giving the Shop Agent direct key access.

## Future extensions

The module can later add persistent policy versions, scoped permissions, rate limits, replay protection, confirmation-token issuance, per-user/per-agent policies and immutable audit storage without changing the basic chat contract.
