# LUNA — CURRENT STATE

Last updated: 2026-09-26

## Handoff purpose
This file is the current handoff reference for continuing LUNA. Read it before making changes. Continue from the current checkpoint; do not restart old work or guess the state.

## Current project state
- Project: LUNA
- Repository: `Masuratuba/Luna`
- Branch: `main`
- Current checkpoint: **CP72 — Prepared**
- Previous checkpoint: CP71 — Quality / CI Audit Complete
- CP72 preparation commits: `d2dc02fa11d7a16877ede20ebd0988c1dc6e1136`, then `5daf6b02cb9636a187fea1706f171686925a8e41`
- Production URL recorded for the project: `https://luna-luna81.vercel.app/`
- UI is intentionally frozen. Do not redesign or alter the pre-Voice UI unless explicitly requested.
- Microsoft OAuth is not part of the current development path unless explicitly resumed.
- Login-bypass/development mode is currently used for the owner's testing.
- CP72 is prepared only; it is **not GREEN and not complete**.

## Work completed through CP71
The repository has been audited against the planned LUNA architecture. The major building blocks are present:
- LUNA Core and routing
- 10 agents with isolation and policy
- Guardian / Guardian Gateway
- action engine/executor and approvals
- memory lifecycle including forget/update
- tasks and projects
- research/search provider boundary
- Microsoft mail/calendar paths
- scheduler runtime, triggers, persistence and delivery
- shop isolation, risk and finance boundaries
- events/audit and diagnostics
- Supabase migration foundation
- CI quality gates and production build
- frozen UI

CP71 specifically completed the Calendar/API quality audit:
- provider date-range validation
- provider transport-failure mapping
- body normalization
- shared route input-error helper
- route-error regression coverage
- missing Microsoft access-token regression coverage
- CI/deployment quality baseline

## CP72 — End-to-End Verification Preparation
Objective: prove the real LUNA execution path before adding or expanding features.

Target chain:
`User request → /api/chat → LUNA Core → decision → agent selection → agent policy/capability → Guardian → action execution → tool/provider → persistence → event/audit → LUNA response`

Acceptance criteria:
1. Normal request enters chat route.
2. Core produces expected decision.
3. Expected agent is selected.
4. Agent policy permits/rejects correctly.
5. Guardian enforces the security decision.
6. Action execution cannot bypass Guardian.
7. Intended tool/provider is actually invoked.
8. Success/failure persistence is truthful.
9. Events/audit reflect the actual outcome.
10. Final LUNA response does not claim an action completed when it did not.
11. Existing tests remain green.
12. TypeScript, ESLint, tests and production build pass.
13. Final CP72 commit has successful Vercel deployment.

Architectural questions to resolve during CP72:
- Explicit UI `agentId` versus automatic Core routing.
- Tool-handler registry versus direct provider invocation in the chat search path.
- Large multi-responsibility chat route; test behavior before considering refactoring.

CP72 non-goals:
- no new agents
- no UI redesign
- no unrelated provider work
- no blind refactor
- no Voice implementation yet
- no Microsoft OAuth expansion

## Continuity rule
Start CP72 by inspecting the existing Core/agent/Guardian/action tests and select the smallest reliable integration boundary. Complete and verify this one task before beginning another. Do not mark CP72 GREEN until fresh CI and deployment verification pass.
