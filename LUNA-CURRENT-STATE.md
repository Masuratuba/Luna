# LUNA — CURRENT STATE

Last updated: 2026-09-14

## Purpose of this file
This is the handoff file for continuing LUNA when a ChatGPT conversation becomes too long. Read this file before making changes. Do not restart old work from memory or guess the state.

## Current project state
- Project: LUNA
- Repository: `Masuratuba/Luna`
- Production: `https://luna-luna81.vercel.app/`
- UI is intentionally frozen. Do not redesign or alter the pre-Voice UI unless explicitly requested.
- Microsoft OAuth is not part of the current development path.
- Login-bypass/development mode is currently used for the owner's testing.

## Current active problem
The Research Agent still returns:
`Ich konnte die Recherche gerade nicht verlässlich ausführen.`
for requests such as:
`Von Tarvisio nach Frankfurt am 20. September 2026, möglichst günstig, egal ob Zug oder Bus.`

The problem is NOT solved yet. Do not ask the user to keep repeatedly testing while the cause is unknown.

## Research path already verified
1. Travel request routes to the Research agent.
2. Research agent policy includes the `search` capability.
3. Guardian permits read-only search.
4. Search provider is registered.
5. OpenAI Responses API is used with `web_search` and forced tool use.
6. Provider has a 45-second bounded timeout and retry without optional source expansion.
7. GPT-5.6 Luna supports Web Search according to current OpenAI API model documentation.

## Important scope consistency
Checkpoint 60 defines:
`search -> search:read`
Normal authenticated users receive `search:read`.
Development/admin identities may use `luna:*`.
The executor had temporarily been changed to require `search`; this was inconsistent with Checkpoint 60. Commit `0291d728ed5bd009aa0be710762df8ca05c16c65` restores `search:read` for the executor.

## Latest research-provider change
Commit `b41e64471186e751992eb92bc929dbf91d1383ee`:
- search timeout increased from 15s to 45s
- retry retained when optional source expansion fails
- successful output text can still be returned when source metadata is absent
Vercel reported SUCCESS for that commit, but the user's real test still failed. Therefore timeout was not the complete fix.

## Next required work — do this before asking for another user test
Do NOT change UI.
Do NOT keep changing prompts blindly.
Do NOT claim the research path works just because Vercel builds.

1. Expose the exact runtime error from the Research provider in a test-only diagnostic path (sanitized: no API key, tokens, or personal data).
2. Run that diagnostic against the deployed environment or otherwise inspect the actual OpenAI error.
3. Determine whether the failure is caused by API/tool invocation, model/tool compatibility, environment configuration, or provider response parsing.
4. Fix the actual root cause.
5. Re-check the complete path: router -> agent policy -> Guardian -> executor scope -> provider -> result extraction -> LUNA response.
6. Only then ask the user for one final real-world test.

## Continuity rule
If a new ChatGPT conversation starts with LUNA work, first read `LUNA-CURRENT-STATE.md`, then continue from the active problem above. Do not make the user explain the project again.

## Checkpoints
- Security/action execution baseline: `CHECKPOINT-60.md`
- Earlier central action policy: `CHECKPOINT-59.md`
- Historical checkpoints are preserved; do not roll back unless the user explicitly says `Checkpoint, zurück an Checkpoint`.
