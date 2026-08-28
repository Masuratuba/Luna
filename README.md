# 🌙 LUNA

**LUNA 0.1 — Personal AI Assistant**

LUNA is designed as a modular personal AI central: chat first, then memory, organization and tools, with future capabilities added without rebuilding the core.

## Core
- Chat
- Memory
- Profile
- Notes
- Reminders
- Plans / Projects
- File metadata
- Tool Engine
- Secure API architecture

## Architecture

`Frontend → API → Luna Core → Memory / Tools → PostgreSQL`

## Repository structure

- `app/` — Next.js UI and API routes
- `lib/luna/` — orchestration and core logic
- `lib/supabase/` — server-side Supabase access
- `supabase/migrations/` — versioned database schema
- `docs/ARCHITECTURE.md` — system architecture and security rules
- `docs/API.md` — API contract

## Security

User-owned database tables use Row Level Security. Provider and service secrets remain server-side in environment variables and are never committed to the repository.

## Status

Foundation and initial schema are being built incrementally. Database migrations must be applied to the LUNA Supabase project before the application is considered production-ready.
