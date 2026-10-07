# LUNA Repository Summary

Last updated: 2026-10-07

## Current status

- Repository: `Masuratuba/Luna`
- Default branch: `main`
- Current HEAD: `a3e85cb8ae7d10b612a58306215d24e241c8ea96`
- Production URL: `https://luna-luna81.vercel.app/`
- CP72: **CLOSED — automated acceptance, CI quality gates and Vercel deployment verified GREEN.**
- Current Vercel status: **SUCCESS**.
- UI: frozen unless explicitly requested.

## Implemented architecture

LUNA currently contains:

- Core routing and 10-agent orchestration
- agent isolation and capability policy
- Guardian / Guardian Gateway
- approvals and action execution
- action/event/audit persistence
- memory lifecycle
- tasks and projects
- search/research
- Microsoft OAuth, mail and calendar
- scheduler runtime, retries, persistence and delivery
- shop/commerce isolation and finance boundaries
- diagnostics and health
- Supabase migrations and RLS
- Next.js frontend
- automated regression coverage

## Post-CP72 hardening

Two focused repairs were completed after CP72:

1. Production test-mode authentication bypass was disabled.
2. Task API field validation was hardened to match the Supabase task constraints.

These are part of current `main`.

## Verification boundary

Do not confuse code readiness with live integration readiness.

Not yet claimed as live-verified:

- authenticated production end-to-end chat with real production data
- live Supabase read/write verification
- live Microsoft OAuth/mail/calendar execution
- external scheduler invocation
- live shop/store/wallet provider activation

## Project rule

Future work is a new checkpoint. Do not reopen or continue historical CP72 work. Verify the exact current commit and its CI/Vercel status before declaring a new change green.
