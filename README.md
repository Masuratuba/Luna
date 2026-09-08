# 🌙 LUNA

**LUNA 0.2.0 — Personal AI Assistant**

LUNA is a modular personal AI assistant: authenticated chat first, then durable memory, organization, provider integrations and controlled tools.

## Core
- Chat and conversation history
- Durable memory with sensitive-content filtering
- Tasks and projects
- Research/search provider boundary
- Microsoft mail and calendar integration
- Controlled tool execution through Guardian
- Scheduler state and persistence
- Agent isolation and capability policy
- Diagnostics, audit events and self-tests

## Architecture

`Frontend → API → Auth → Identity → Luna Core → Agent/Capability Gateway → Guard/Approval → Action Engine → Providers → Events/Audit → Health`

## Repository structure

- `app/` — Next.js UI and API routes
- `lib/luna/` — orchestration, agents, policy, guard and execution logic
- `lib/providers/` — provider adapters and validation
- `lib/integrations/` — authenticated external integrations
- `lib/supabase/` — server-side Supabase access
- `supabase/migrations/` — versioned database schema and privilege reconciliation
- `docs/` — architecture, API and checkpoint documentation
- `tests/` — architecture and regression tests

## Security

Protected user data is authenticated and user-scoped. Database tables use Row Level Security. Provider and service secrets remain server-side. Sensitive memory content is rejected at API boundaries. Destructive provider actions are routed through the Guardian/action boundary and require explicit approval/confirmation.

## Runtime status

The repository is CI-gated with TypeScript, ESLint, tests and a production build. Production readiness still depends on the required Supabase, OpenAI and Microsoft configuration being present and on applying all versioned Supabase migrations to the live Luna project.
