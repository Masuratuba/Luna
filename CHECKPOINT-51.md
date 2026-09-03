# Checkpoint 51 — Luna Intelligence Core

Base: Checkpoint 50 (`0503072cf7387f8c10d85cce9114c16a4c0b4298`)

## Goal
Move Luna from a routing/action foundation toward a verified intelligence loop: understand context, track epistemic state, detect learning signals, support focused getting-to-know-you follow-ups, and enforce explicit truth rules.

## Completed
- Added `intelligence-core.ts` with deterministic intelligence assessment.
- Added explicit `known`, `inferred`, and `unknown` epistemic states.
- Added learning-signal detection for interests, preferences, goals, habits, projects, and communication/decision cues.
- Added memory candidates without automatic persistence; durable writes remain explicit or separately authorized.
- Added focused getting-to-know-you follow-up signals rather than forcing personal questions every turn.
- Added secret protection so credentials are never converted into learning signals or memory candidates.
- Connected intelligence guidance and truth rules to the chat response path.
- Added regression tests for secrets, preferences, goals/projects, uncertainty, follow-up behavior, and ordinary conversation.

## Truth invariants
- An inference is never presented by the intelligence layer as a verified fact.
- The intelligence layer never claims an action succeeded.
- The intelligence layer never invents memories, sources, tool results, or personal facts.
- Uncertainty is represented explicitly.
- Learning candidates are suggestions for the reasoning layer, not automatic durable memory writes.

## Scope boundary
This checkpoint establishes the intelligence contract and chat integration. Autonomous outbound contact, recurring follow-ups, and full multi-step planning remain later capabilities that need explicit scheduling/event infrastructure.

## Validation
- GitHub CI: TypeScript -> ESLint -> Tests -> Production Build.
- Vercel deployment is not required for this code-first checkpoint unless CI or integration testing indicates otherwise.
