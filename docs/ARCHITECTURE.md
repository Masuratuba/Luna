# LUNA — System Architecture

## Purpose
LUNA is a modular personal AI assistant. The foundation is provider-independent: external API keys and provider connections are added after the architecture is stable.

## Runtime flow

`Frontend → API → Auth → Identity/Context → LUNA Core → Multi-Agent Router → Isolated Specialist Agent → Capability Gateway → Permissions → Guard → Approval → Action Engine → Events/Audit → Recovery/Reflection → Health`

## Multi-agent layer

LUNA Core makes the first decision and assigns work to a specialist. Agents are isolated by identity, data scope and capability allow-list; an agent does not receive arbitrary access to every LUNA tool.

Current agents include LUNA Core, Research, Memory, Planner, Action, Security, Document, Coding, Analysis and the new **Shop Agent**.

## Isolated Shop Agent

The Shop Agent is a dedicated commerce operator. It may run an end-to-end shop workflow while remaining isolated from unrelated LUNA capabilities.

### Shop Agent responsibilities

1. Discover candidate products using Deep Search.
2. Analyze demand and product performance using Analytics.
3. Analyze competition and market data.
4. Calculate prices according to the configured pricing policy.
5. Generate product titles/descriptions and other catalog content.
6. Update the isolated shop catalog.
7. Publish changes only through the controlled execution boundary.

### Shop Agent allow-list

- `deep-search` — read
- `analytics` — read
- `market-data` — read
- `catalog.read` — read
- `catalog.write` — write
- `content.write` — write
- `pricing.write` — write
- `store.read` — read
- `orders.read` — read
- `store.publish` — execute + explicit approval

### Shop Agent deny-list

The Shop Agent cannot directly access user memory, secrets, authentication management, arbitrary tools, code execution, payments, payouts or destructive store deletion. Denied capabilities stay denied even if a task asks for them.

### Isolation model

Isolation is capability-based and enforced at the server-side tool gateway. The agent receives a narrow execution context containing only the capabilities granted to its agent identity. Each tool request is checked against the agent allow-list, requested mode (`read`, `write`, `execute`), user ownership and the Guard/Approval layer before execution.

The existing application-level sandbox is not treated as a security boundary by itself. Production isolation should additionally use a separate service/process or equivalent platform boundary for untrusted code or high-risk workloads.

## Foundation modules

- **Core / Orchestrator** — understands requests and coordinates decisions.
- **Multi-Agent Router** — selects the appropriate specialist.
- **Agent Isolation / Capability Gateway** — gives each specialist only explicit capabilities.
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
- **Action Engine** — controlled execution boundary; never reports a tool as completed when no provider executed it.
- **Execution Queue** — bounded retries and delayed attempts.
- **Event Bus** — internal event propagation.
- **Audit Service** — records security-relevant decisions and action outcomes.
- **Error Recovery** — bounded retry and explicit failure handling.
- **Reflection / Feedback** — captures outcomes, issues and user feedback for later improvement.
- **Self-Test Engine** — independently tests registered health checks.
- **Performance Monitor** — measures execution duration and success.
- **Diagnostics / Health** — exposes local module health and clearly reports missing external configuration without pretending it is connected.
- **Version Manager** — tracks application, schema and rules versions.
- **Configuration Engine** — central runtime defaults and overrides.
- **Secrets Boundary** — server-only access to environment secrets; never client-side.
- **Sandbox Boundary** — application-level isolation for experimental execution; not a substitute for production process isolation.
- **Document Engine** — common representation for uploaded documents and extracted text.
- **Backup Metadata** — tracks backup scope and timestamps; storage implementation remains replaceable.
- **Notification Engine** — native browser notifications.
- **Reminder Client + Service Worker** — lightweight reminders without an additional notification vendor.

## Data layer

PostgreSQL/Supabase is the source of truth for persistent state. User-owned tables use Row Level Security. Versioned migrations live under `supabase/migrations`.

The agent isolation migration persists agent identities, capability grants and agent runs. Shop data should use a dedicated shop/workspace scope so the Shop Agent cannot query unrelated user domains.

## Security

1. Authenticate before protected user-data access.
2. Scope every query to the authenticated user and agent workspace.
3. Keep provider/service secrets server-side.
4. Validate input at API boundaries.
5. Route every tool through registry → agent capability gateway → permissions → Guard.
6. Require explicit approval for publishing, destructive actions, payments and other sensitive operations.
7. Record important permission, agent and action decisions in the audit trail.
8. Do not expose secret values through diagnostics, logs or notifications.

## Provider boundary

OpenAI, web search, email, calendar, voice, storage, analytics and commerce platforms are adapters behind the tool/action boundary. The Shop Agent never receives provider credentials directly.

## Health semantics

`ok` means the local module is healthy and the required external dependency is configured. `not_configured` means the architecture is healthy but the provider credentials have not been installed. The overall health status remains `degraded` until required production configuration is present.

## Current phase boundary

The architecture now defines the isolated Shop Agent and its access model. Provider adapters, credentials and real store activation remain separate implementation steps.
