# LUNA — CURRENT STATE

Last updated: 2026-10-07

## Current repository state

- Repository: `Masuratuba/Luna`
- Branch: `main`
- Current HEAD: `a3e85cb8ae7d10b612a58306215d24e241c8ea96`
- Production URL: `https://luna-luna81.vercel.app/`
- CP72: **CLOSED and verified for automated acceptance, CI quality gates and Vercel deployment.**
- Latest post-CP72 security repair: production test-mode authentication bypass is disabled.
- Latest post-CP72 task hardening: task POST/PATCH field types and database constraints are validated at the API boundary.
- Current Vercel status for HEAD: **SUCCESS**.
- UI remains intentionally frozen unless explicitly requested.

## What is complete

The repository contains the major LUNA V1 building blocks:

- authenticated chat and conversation persistence
- LUNA Core routing and specialist-agent selection
- 10-agent system with capability/policy boundaries
- Guardian / Guardian Gateway
- durable approvals and action execution
- memory lifecycle including save, update and forget
- tasks and projects
- research/search provider boundary
- Microsoft OAuth, Mail and Calendar provider/API paths
- scheduler runtime, persistence, retries and delivery
- commerce/shop isolation and financial boundary modules
- events, audit and diagnostics
- Supabase migration foundation and RLS
- TypeScript, ESLint, test and production-build quality gates at the verified CP72 baseline
- frozen pre-Voice UI

## Important verification boundary

Automated acceptance is verified, but the following are **not** claimed as live production verification:

- a live authenticated production chat request using real user data
- live Supabase write/read verification against production data
- a complete live Microsoft OAuth + Mail + Calendar cycle
- a real production scheduler invocation with external cron
- live commerce/store/wallet activation

These require real external credentials, accounts or production-side configuration and must be tested deliberately rather than inferred from source code.

## Current security state

- Production authentication bypass is disabled even if `LUNA_TEST_MODE=true`.
- Provider and service secrets remain server-side.
- User-owned database access remains user-scoped and protected by RLS.
- Destructive Microsoft and commerce actions require durable approval and Guardian execution.

## Next work

The next work should be treated as a new product-validation phase, not as CP72.

Recommended order:

1. Safe live staging/production verification of chat, memory, tasks and search.
2. Safe Microsoft OAuth/mail/calendar verification.
3. Controlled scheduler execution test.
4. Connect remaining UI sections to already-existing APIs.
5. Decide separately whether Shop/Commerce should be activated with a real provider.

Do not claim any of these live integrations are complete until the real execution result is observed.

## Continuity rule

Before changing code, inspect the current `main` SHA and relevant status checks. Make one scoped change at a time. Verify the exact resulting commit. Keep automated CI, Vercel deployment and live integration verification as separate claims.
