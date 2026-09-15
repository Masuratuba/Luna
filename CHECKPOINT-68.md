# CHECKPOINT 68 — Research Stabilization & Full-System Review Baseline

Date: 2026-09-15
Repository: `Masuratuba/Luna`
Branch: `main`
Baseline before checkpoint documentation: `9cc63116bc4c27f7ab1e8280edca07fb6e7b5b62`
Checkpoint documentation commit: `a49e24a0a9f128c72a38872de5f293649991029b`

## Checkpoint numbering
Checkpoint 65 already exists in the repository and records LUNA Memory 1.0. Checkpoints 66 and 67 also exist. This document is therefore the current Checkpoint 68 and does not replace historical checkpoints.

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

## CI / deployment status at checkpoint creation
- The previous `main` research commit `9cc63116...` had a Vercel success status, but its GitHub Actions test job failed during the Tests step; TypeScript and ESLint passed, while Production build was skipped.
- The checkpoint documentation commit `a49e24a...` has a new GitHub Actions run currently in progress and a Vercel status currently pending.
- Therefore this checkpoint is a **review baseline, not a full CI-verified production checkpoint**.

## Verification limitation
- GitHub source and status checks were inspected directly.
- A local full test-suite execution was not performed in this environment because outbound GitHub/DNS access was unavailable during the attempted local clone. Do not claim a local full-suite pass.

## Purpose
This checkpoint preserves the working Research state while the comprehensive system review investigates the failing CI test and the remaining production-verification gaps. Future fixes should be made from this state and re-verified before being marked complete.
