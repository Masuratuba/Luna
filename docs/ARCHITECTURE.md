# LUNA — System Architecture

## Purpose
LUNA is a modular personal AI assistant. The foundation is provider-independent: external API keys and provider connections are added after the architecture is stable.

## Runtime flow

`Frontend → API → Auth → Identity/Context → LUNA Core → Memory/Search/Tasks → Planner → Workflow → Capability/Tool Registry → Permissions → Guard → Approval → Action Engine → Events/Audit → Recovery/Reflection → Health`

## Foundation modules

- **Core / Orchestrator** — understands requests and coordinates decisions.
- **Profile / Personal Context / Session Context** — durable identity, preferences, projects and current context.
- **Memory Engine** — explicit memory capture, structured storage and relevant retrieval.
- **Deep Search / Research Manager** — research jobs, source collection, comparison and synthesis.
- **Knowledge Graph** — relationships between people, projects, facts and other entities.
- **Planner** — decomposes goals into explicit steps and tracks plans.
- **Task Manager** — persistent tasks, priorities, deadlines and recurring work.
- **Scheduler** — validates future execution times and due work.
- **Workflow Engine** — validates multi-step action dependencies.
- **Capability Manager** — records what LUNA can actually do.
- **Tool Registry** — single registry of tools and declared permissions.
- **Permissions** — least-privilege, deny-by-default tool policy.
- **Luna Guard** — risk and intent checks before sensitive execution.
- **Approval Engine** — explicit user approval state for actions that require it.
- **Action Engine** — controlled execution boundary.
- **Execution Queue** — bounded retries and delayed attempts.
- **Event Bus** — internal event propagation.
- **Audit Service** — records security-relevant decisions and action outcomes.
- **Error Recovery** — bounded retry and explicit failure handling.
- **Reflection / Feedback** — captures outcomes, issues and user feedback for later improvement.
- **Self-Test Engine** — independently tests registered health checks.
- **Performance Monitor** — measures execution duration and success.
- **Diagnostics / Health** — exposes system and dependency status without secrets.
- **Version Manager** — tracks application, schema and rules versions.
- **Configuration Engine** — central runtime defaults and overrides.
- **Secrets Boundary** — server-only access to environment secrets; never client-side.
- **Sandbox Boundary** — isolates experimental/risky execution paths at the application layer.
- **Document Engine** — common representation for uploaded documents and extracted text.
- **Backup Metadata** — tracks backup scope and timestamps; storage implementation remains replaceable.
- **Notification Engine** — native browser notifications.
- **Reminder Client + Service Worker** — lightweight reminders without an additional notification vendor.

## Data layer

PostgreSQL/Supabase is the source of truth for persistent state. User-owned tables use Row Level Security. Versioned migrations live under `supabase/migrations`.

Persistent domains include profiles, memories, tasks, plans, permissions, events, audit records and reminders.

## Notification design

LUNA uses the browser's native Notification API and a service worker. Simple reminders can be scheduled client-side while the application is active. Background push requires browser permission and a registered push subscription; no separate notification SaaS is part of the foundation.

## Security

1. Authenticate before protected user-data access.
2. Scope every user query to the authenticated user.
3. Keep provider/service secrets server-side.
4. Validate input at API boundaries.
5. Route every tool through registry → permissions → Guard.
6. Require explicit approval for destructive or sensitive actions.
7. Record important permission and action decisions in the audit trail.
8. Do not expose secret values through diagnostics, logs or notifications.

## Provider boundary

OpenAI, web search, email, calendar, voice, storage and other integrations are adapters behind the tool/action boundary. They are not hard-coded into the foundation.

## Current phase boundary

The architecture and module boundaries are being established first. Provider keys, external service configuration and production activation are intentionally separate steps. A module being present in the repository does not mean its external dependency is already connected.
