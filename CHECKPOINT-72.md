# LUNA Checkpoint CP72 — Prepared

## Scope

CP72 is the next isolated work package after CP71.

**Objective:** verify the real LUNA Core end-to-end execution path before adding or expanding features.

CP72 is **prepared, not yet completed**.

## Starting point

- Repository: `Masuratuba/Luna`
- Branch: `main`
- Starting commit: `d893147c8d279ffb4d8d8288b55eb3113dec7512`
- Previous checkpoint: CP71 — Quality / CI Audit Complete
- UI remains frozen.
- Microsoft OAuth remains outside the active development path unless explicitly resumed.
- Workflow rule: complete and verify this task before starting the next task.

## CP71 work carried forward

The repository-wide audit following CP71 confirmed that LUNA now contains the major planned building blocks:

- LUNA Core and message routing
- 10-agent system
- agent policies and isolation
- Guardian / Guardian Gateway
- action engine and action executor
- approval system
- memory lifecycle including forget/update
- tasks and projects
- research/search provider boundary
- Microsoft mail and calendar provider/API paths
- scheduler runtime, triggers, persistence and delivery
- shop isolation, risk and finance boundaries
- events and audit persistence
- diagnostics and health paths
- Supabase migrations for the runtime foundation
- CI quality gates
- frozen UI

CP71 specifically completed the Calendar/API quality audit and confirmed the CI/deployment quality baseline.

## CP72 verification chain

The main path to verify is:

`User request
→ /api/chat
→ LUNA Core
→ decision
→ agent selection
→ agent policy/capability
→ Guardian
→ action execution
→ tool/provider
→ persistence
→ event/audit
→ LUNA response`

## CP72 acceptance criteria

The work is complete only when the selected end-to-end path is actually covered and verified, not merely when individual modules compile.

Verify:

1. A normal user request enters the chat route.
2. LUNA Core produces the expected decision.
3. The expected agent is selected.
4. Agent policy permits or rejects the capability correctly.
5. Guardian performs the required security decision.
6. Action execution cannot bypass the Guardian boundary.
7. The intended provider/tool is actually invoked.
8. Successful and failed execution states are persisted correctly.
9. Event/audit records reflect the real outcome.
10. The final LUNA response reflects the actual execution result and does not claim an action completed when it did not.
11. Existing tests remain green.
12. TypeScript, ESLint, tests and production build pass.
13. Vercel deployment for the final CP72 commit succeeds.

## Known architectural questions to resolve during CP72

### Agent selection
The UI can supply an `agentId`, while `runLunaCore()` independently routes from the message. CP72 must establish the intended contract between explicit agent selection and automatic routing.

### Tool registry
A fail-closed `tool-handler-registry` exists, but the chat search path currently invokes the provider boundary directly. CP72 must verify whether this is intentional or an execution-path inconsistency before any refactor is made.

### Chat route responsibility
`app/api/chat/route.ts` currently coordinates authentication, conversations, memory, core routing, guard checks, actions, search, persistence and OpenAI response generation. CP72 should test behavior first; no broad refactor is authorized merely because the route is large.

## Explicit non-goals for CP72

- No new agent.
- No UI redesign.
- No unrelated provider feature work.
- No blind refactor.
- No Voice implementation yet.
- No Microsoft OAuth expansion.

## Next action

Start by inspecting the existing Core/agent/Guardian/action tests and choose the smallest reliable integration boundary for the end-to-end proof.

Do not mark CP72 GREEN until the final commit has fresh CI and deployment verification.
