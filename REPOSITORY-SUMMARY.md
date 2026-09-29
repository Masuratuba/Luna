# LUNA Repository Summary
Last updated: 2026-09-29

## Repository and current status
- Repository: `Masuratuba/Luna`
- Default branch: `main`
- Production URL: https://luna-luna81.vercel.app/
- Current checkpoint: **CP72 CLOSED — automated acceptance, CI quality gates, and Vercel deployment verified GREEN.**
- Current verified closeout commit at CP72 close: `ccc27208cea2d6c23b42d361e3ef6171e89f1dd1`
- GitHub Actions run #532: SUCCESS — https://github.com/Masuratuba/Luna/actions/runs/36608158005
- Vercel status: SUCCESS — https://vercel.com/luna81/luna/HArXzttiw1Jkun1hBzHXKaZ6f4qE

Note: the repository may receive subsequent documentation/handoff commits after the CP72 closeout SHA. Always inspect current `main` and verify fresh statuses before relying on the closeout SHA as HEAD.

## What the project contains
The current architecture includes:
- LUNA Core and request routing
- 10-agent system, agent policy/capability boundaries
- Guardian / Guardian Gateway and action execution boundary
- tool-handler registry and provider registry for search
- action persistence, event logging, and audit logging
- task/project and memory lifecycle paths (including forget/update)
- Microsoft mail/calendar API/provider paths
- scheduler runtime, triggers, persistence, and delivery
- shop isolation, risk/finance boundaries
- diagnostics/health paths and Supabase migration foundation
- Next.js application and frozen pre-Voice UI

This is an architecture inventory based on repository checkpoint documentation; it does not imply that every integration has been live-tested.

## CP72 completed
Goal: verify the critical execution chain:
`user request → /api/chat → LUNA Core → decision/agent → policy → Guardian → action executor → registered tool/provider → persistence → event/audit → response`

Automated coverage added or strengthened for:
- chat-route contract and agent-selection contract;
- Core decision and Guardian authorization;
- fail-closed behavior when a handler is missing;
- default registered search handler and provider invocation/error propagation;
- integrated Core → Guardian → provider → action persistence/event/audit for success and provider failure;
- user-scoped action updates;
- event/audit status, outcome, risk and error-data consistency;
- surfaced persistence errors;
- truthful action failure responses;
- memory-validation failures not being represented as completed actions.

Final CP72 closeout evidence:
- GitHub Actions #532: SUCCESS for TypeScript, ESLint, tests, and production build.
- Vercel combined status: SUCCESS.
- See `CHECKPOINT-72.md`, `CHECKPOINT.md`, and `LUNA-CURRENT-STATE.md` for the acceptance audit and evidence links.

## Verification boundary — read this carefully
CP72 is GREEN for **automated acceptance, CI quality gates, and deployment**. This is not a claim that:
- a live authenticated production HTTP request was exercised end to end;
- live Supabase write/read behavior was verified against production data;
- every external provider (Microsoft, scheduler delivery, etc.) was exercised live.

The integrated tests use controlled providers and fake persistence. Live integration verification is a separate future task and should be explicitly scoped, securely configured, and performed without exposing credentials or altering real user data.

## What remains to do
No further CP72 acceptance items remain open within its documented automated scope. Future work should be planned as a new checkpoint rather than mixed into CP72.

Suggested order for the next planning session:
1. **CP73 scope decision:** choose the next single work package and write acceptance criteria before coding.
2. **Optional live integration verification:** plan a safe authenticated staging/sandbox test for the chat route and Supabase; define test account, test data, cleanup, and rollback before running it.
3. **Continue deferred product work only when explicitly authorized:** Voice implementation, Microsoft OAuth expansion, or UI changes remain outside CP72; UI is currently frozen.
4. For any future implementation: change one task at a time, run focused tests, run full CI (TypeScript, ESLint, tests, production build), verify Vercel for the exact same commit, then update checkpoint/handoff docs.

## Working rules for future sessions
- Read `LUNA-CURRENT-STATE.md`, `CHECKPOINT.md`, and this summary first.
- Never assume a prior status applies to the current HEAD. Retrieve the latest `main` SHA and verify its actual CI run and Vercel status.
- Do not equate a green Vercel deployment with green GitHub Actions.
- Do not equate green CI with live production integration.
- Do not say “fully green” without naming the exact commit and scope.
- Keep UI frozen unless Masura explicitly authorizes a change.
- Do not start the next task until the current task has been completed and verified.
- No broad refactor, new agent, Voice work, or Microsoft OAuth expansion without explicit scope approval.

## Primary references
- CP72 acceptance audit: `CHECKPOINT-72.md`
- Checkpoint index: `CHECKPOINT.md`
- Current handoff/state: `LUNA-CURRENT-STATE.md`
- GitHub Actions #532: https://github.com/Masuratuba/Luna/actions/runs/36608158005
- Vercel deployment: https://vercel.com/luna81/luna/HArXzttiw1Jkun1hBzHXKaZ6f4qE
