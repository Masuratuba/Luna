# LUNA — CURRENT STATE

Last updated: 2026-09-26

## Handoff purpose
This file is the current handoff reference for continuing LUNA in a new conversation. Read it before making changes. Continue from the current checkpoint; do not restart old work or guess the state.

## Current project state
- Project: LUNA
- Repository: `Masuratuba/Luna`
- Branch: `main`
- Current checkpoint: **CP71 — Quality / CI Audit Complete**
- Previous checkpoint: CP70 — D1 Memory Forget Complete
- Current main commit before this documentation update: `10d229eef0ff67b67766365706375c8754224c67`
- Production URL recorded for the project: `https://luna-luna81.vercel.app/`
- UI is intentionally frozen. Do not redesign or alter the pre-Voice UI unless explicitly requested.
- Microsoft OAuth is not part of the current development path unless explicitly resumed.
- Login-bypass/development mode is currently used for the owner's testing.

## CP70 → CP71 work completed
The post-CP70 Calendar/API and quality audit was completed.

### Calendar
- Calendar provider date-range validation is implemented and tested.
- Calendar provider transport failures are mapped and tested.
- Calendar provider body normalization is implemented and tested.
- Calendar route uses the shared `calendarInputError` helper.
- Dedicated route-error regression coverage exists.
- Missing Microsoft access-token behavior is explicitly tested.
- The latest Calendar test change is in commit `31783a3ed2c6e81438beef27a584b2d719191855`.

## CI quality gates
GitHub Actions workflow: `.github/workflows/ci.yml`

The workflow runs on pushes to `main` and pull requests and performs:
1. dependency installation
2. TypeScript `tsc --noEmit`
3. ESLint
4. `npm test`
5. production build

For commit `31783a3ed2c6e81438beef27a584b2d719191855`, Luna CI run **#474** completed successfully. All five quality gates passed.

## Deployment verification
- Vercel status for commit `31783a3ed2c6e81438beef27a584b2d719191855`: success.
- GitHub Actions and Vercel both confirmed the current Calendar/test state.
- Supabase availability is not required for the static/unit quality gates above; live Supabase-dependent functionality still requires an active/configured Supabase project.

## Known repository housekeeping
There are older open GitHub issues/PRs from historical checkpoints. They are not automatically production failures. They must be reviewed individually before being treated as active defects or work items.

## Checkpoints
- CP70: D1 — Memory Forget Complete
- CP71: Quality / CI Audit Complete — GREEN

## Continuity rule
When continuing LUNA, start from CP71 and inspect the current `main` commit/status before changing code. Keep the isolated workflow: complete and verify one task before beginning the next.
