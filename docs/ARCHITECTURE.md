# LUNA — System Architecture

## Purpose
LUNA is a modular personal AI assistant. The foundation is provider-independent: external API keys and provider connections are added only after the architecture is stable.

## Runtime flow

`Frontend → API → Auth → Luna Core → Context/Memory → Planner → Guard/Permissions → Action Engine → Tools → Events/Audit → PostgreSQL`

## Foundation modules

- **Core** — normalizes requests and routes decisions.
- **Profile** — durable user preferences and identity context.
- **Personal Context** — combines profile, relevant memories and recent conversation context.
- **Memory Engine** — explicit memory capture, normalization and relevance selection.
- **Deep Search** — research instructions and source cross-checking; provider execution remains server-side.
- **Planner** — decomposes multi-step goals into explicit plan steps and tracks their state.
- **Task Engine** — persistent user tasks and project relationships.
- **Tool Registry** — single registry of capabilities and their permission requirements.
- **Permissions** — least-privilege, deny-by-default tool policy.
- **Luna Guard** — risk evaluation and confirmation gates for sensitive operations.
- **Action Engine** — controlled execution boundary; no provider-specific execution belongs in the UI.
- **Event Bus** — internal event propagation between modules.
- **Audit Service** — records allowed, blocked, successful and failed actions.
- **Error Recovery** — bounded retries and explicit failure results.
- **Diagnostics / Health** — exposes module and provider configuration status.

## Database

PostgreSQL/Supabase is the source of truth for persistent state. User-owned tables use Row Level Security. Migrations are append-only and versioned under `supabase/migrations`.

## Security

1. Authenticate before user-data access.
2. Scope every query to the authenticated user.
3. Keep provider/service secrets server-side.
4. Validate input at API boundaries.
5. Route every tool through the registry and permission layer.
6. Require explicit confirmation for destructive/external actions.
7. Record security-relevant decisions in the audit log.

## Provider boundary

OpenAI, search providers, email, calendar, file, voice and other integrations are adapters behind the tool/action boundary. They are not dependencies of the foundation.

## Completion criterion

The foundation is considered structurally complete when Core, Profile, Personal Context, Memory, Search, Planner, Tasks, Tool Registry, Permissions, Guard, Action Engine, Event Bus, Audit, Recovery, Diagnostics and database migrations are present and internally consistent. Provider keys and external integrations are the next phase.
