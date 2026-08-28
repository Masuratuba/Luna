# LUNA 0.1 — System Architecture

## Core flow

`Frontend → API → Luna Core → Memory / Tools → PostgreSQL`

## Layers

### 1. Frontend
Next.js/React UI. It is responsible for presentation, user interaction and authenticated session state. It must not contain provider secrets or direct tool credentials.

### 2. API
Next.js Route Handlers under `app/api`. Every protected request authenticates the user through Supabase and validates input before touching the database or an external provider.

### 3. Luna Core
`lib/luna` is the orchestration layer. It receives a normalized request context, decides what capability is needed, loads relevant memory when required, and delegates tool work. UI code must not decide how tools are executed.

### 4. Memory
Supabase/PostgreSQL stores durable user-owned profile, memory, notes, reminders, plans and file metadata. Row Level Security is enabled for every user-owned table.

### 5. Tools
Future integrations (calendar, email, web research, document processing, creative generation, voice and external APIs) plug into the Core through explicit tool contracts. Each tool is isolated from the UI.

### 6. Provider boundary
OpenAI and other providers are called only from server-side code. Secrets live in environment variables and are never committed to GitHub or sent to the browser.

## Database principles

- PostgreSQL is the source of truth for persistent LUNA state.
- Every user-owned row contains `user_id` and is protected by RLS.
- Migrations are append-only and versioned under `supabase/migrations`.
- New modules receive separate tables/migrations instead of destabilizing existing core tables.

## Security principles

- Authenticate before accessing user data.
- Scope all database reads/writes to the authenticated user.
- Never expose service-role/provider keys client-side.
- Validate request payloads at the API boundary.
- Keep tool permissions explicit and server-side.
- Prefer least-privilege access and deny-by-default policies.

## Module roadmap

Core 0.1: Chat + Memory + Profile + Notes + Reminders + Plans + File metadata.

Future modules: Tasks, Calendar, Email, Research, Vision, Voice, Creative, Marketing, Connections/Integrations and automation. These are extension points, not dependencies of the initial core.
