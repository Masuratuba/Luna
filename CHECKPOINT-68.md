# CHECKPOINT 68 — Research Stabilization & Full-System Review Baseline

Date: 2026-09-15
Repository: `Masuratuba/Luna`
Branch: `main`
Baseline commit: `9cc63116bc4c27f7ab1e8280edca07fb6e7b5b62`

## Important checkpoint numbering note
The repository already contains historical Checkpoints 66 and 67. Therefore this current stable state is recorded as Checkpoint 68 rather than creating a retroactive Checkpoint 65 that would break the project chronology.

## Research status
- Fixed the Research provider's live web-search invocation.
- `gpt-5-search-api` is called with `web_search_options: {}`.
- Search requests use an explicit 45-second SDK timeout with `maxRetries: 0`.
- Chat Completions URL citations are extracted and returned as Research sources.
- Added regression tests for citation extraction and invalid URL handling.
- The deployed normal LUNA Core path successfully handled the travel research test and returned a sourced answer.
- A second test correctly refused to invent three bookable connections or a confirmed fare when the available evidence did not verify them.

## Routing status
- Travel request `Von Tarvisio nach Frankfurt am 20. September 2026, möglichst günstig, egal ob Zug oder Bus` is covered by a regression case and routes to `research`.
- LUNA currently has 10 registered agents: Core, Research, Memory, Planner, Action, Security, Document, Coding, Analysis, Shop.

## Safety / policy baseline
- Research is read-only and has no policy-modification, secret, credential-export, or code-execution capability.
- Action remains approval-gated.
- Coding remains approval-gated.
- Shop publishing remains approval-gated.
- Existing Checkpoint 60 trusted-identity/search scope rules remain the baseline.

## Deployment
- Current `main` commit has a successful Vercel status check.
- Production URL recorded in the project state remains `https://luna-luna81.vercel.app/`.
- UI remains frozen by project rule.

## Verification limitation
- GitHub source and status checks were inspected directly.
- A local full test-suite execution was not performed in this environment because outbound GitHub/DNS access was unavailable during the attempted local clone. Do not claim a local full-suite pass from this checkpoint.

## Purpose
This checkpoint is the safe baseline for the requested comprehensive LUNA system review. Future fixes should be made from this state and verified before being marked complete.
