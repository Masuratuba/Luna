# CP72 Acceptance Criteria Audit

Audit date: 2026-09-29
Repository: `Masuratuba/Luna`
Branch: `main`
Audited main commit: `8e49553507d0a82adf1b5bacbcd5f3bf746f91c0`

## Current verdict

**CP72 is NOT YET GREEN.** The latest CI and Vercel deployment are green, but a green build is not equivalent to proving the entire acceptance chain end-to-end.

## Criteria matrix

| # | Acceptance criterion | Evidence currently present | Status |
|---|---|---|---|
| 1 | Normal user request enters `/api/chat` | Route implementation inspected; contract test reads route source, but no request-level route integration test | PARTIAL |
| 2 | Core produces expected decision | `core-guardian-flow.test.ts` asserts `USE_TOOL` | UNIT VERIFIED |
| 3 | Expected agent is selected | Core test asserts research agent; explicit UI `agentId` and automatic action-agent routing are separate in route, but contract is not behaviorally tested | PARTIAL |
| 4 | Agent policy permits/rejects capability | Core-to-Guardian test covers an allowed research path; broader deny cases need route-level evidence | PARTIAL |
| 5 | Guardian makes security decision | Core-to-Guardian tests exercise Guardian allow/fail-closed behavior | UNIT VERIFIED |
| 6 | Action execution cannot bypass Guardian | Main route uses `executeThroughGuardian`; missing-handler test fails closed; no full HTTP-route bypass test | PARTIAL |
| 7 | Intended tool/provider is invoked | Registry and handler are tested independently; route contract checks wiring statically; no request-level proof of provider invocation | PARTIAL |
| 8 | Success/failure persistence is truthful | Persistence unit tests cover success, failure and DB write errors | UNIT VERIFIED |
| 9 | Event/audit reflects actual outcome | Persistence unit tests assert matching status/error and audit outcome | UNIT VERIFIED |
| 10 | Final response reflects actual execution | Failure-response helper and memory-validation tests exist; full chat-route response behavior is not exercised end-to-end | PARTIAL |
| 11 | Existing tests remain green | GitHub Actions run #518: test step SUCCESS | GREEN |
| 12 | TypeScript, ESLint, tests and production build pass | GitHub Actions run #518: all four steps SUCCESS | GREEN |
| 13 | Final CP72 commit has successful Vercel deployment | Vercel status for audited main commit is SUCCESS; CP72 final commit has not yet been declared | DEPLOYMENT GREEN; CHECKPOINT OPEN |

## CI evidence

- GitHub Actions run #518: https://github.com/Masuratuba/Luna/actions/runs/36605488558
- Run head SHA: `8e49553507d0a82adf1b5bacbcd5f3bf746f91c0`
- Verified quality job steps: TypeScript, ESLint, Tests, Production build — all SUCCESS.
- Vercel status for the same SHA: SUCCESS.

## Required next work before CP72 can be marked GREEN

1. Add a reliable request-level integration test around the actual chat route, with authentication/database/provider boundaries mocked or injected safely.
2. Prove the route sends a search request through the Guardian and registered tool handler to the intended provider, and that the provider result is persisted and reflected in the response.
3. Prove a denied/failed execution cannot return a success response or completed status.
4. Explicitly test the contract between selected conversation agent (`agentId`) and Core-selected action agent.
5. Run fresh CI and Vercel deployment on the final CP72 commit.
6. Update `CHECKPOINT-72.md`, `CHECKPOINT.md`, and `LUNA-CURRENT-STATE.md` only after the end-to-end evidence passes.

## Scope guard

Do not redesign the UI, add agents, expand Microsoft OAuth, implement Voice, or perform broad route refactoring as part of this closure work.
