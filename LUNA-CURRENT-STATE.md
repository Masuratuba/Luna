# LUNA — CURRENT STATE

Last updated: 2026-09-15

## Purpose of this file
This is the handoff file for continuing LUNA when a ChatGPT conversation becomes too long. Read this file before making changes. Do not restart old work from memory or guess the state.

## Current project state
- Project: LUNA
- Repository: `Masuratuba/Luna`
- Current `main` after the research fixes is advancing from the previously deployed `7923a9fa9a65e99d97d90a7ba0c3227e106f4a59`.
- Production URL recorded for the project: `https://luna-luna81.vercel.app/`
- UI is intentionally frozen. Do not redesign or alter the pre-Voice UI unless explicitly requested.
- Microsoft OAuth is not part of the current development path.
- Login-bypass/development mode is currently used for the owner's testing.

## Active problem and root cause found
The Research Agent was still returning:
`Ich konnte die Recherche gerade nicht verlässlich ausführen.`
for requests such as:
`Von Tarvisio nach Frankfurt am 20. September 2026, möglichst günstig, egal ob Zug oder Bus.`

The previously assumed timeout problem was not the complete cause.

The current Research provider had been switched to the dedicated Chat Completions search model `gpt-5-search-api`, but the actual call omitted the required `web_search_options: {}` parameter from the OpenAI search example. It also did not pass an explicit 45-second SDK timeout for the search call and discarded the Chat Completions `url_citation` annotations, so source URLs were not propagated into LUNA.

OpenAI's current documentation confirms that `gpt-5-search-api` is the Chat Completions web-search model and shows `web_search_options: {}` on the call. It also states that the response contains `message.content` plus URL citation annotations.

## Research path verified
1. Travel request routes to the Research agent.
2. Research agent policy includes the `search` capability.
3. Guardian permits read-only search.
4. Search provider is registered.
5. The provider uses `gpt-5-search-api` with explicit `web_search_options: {}`.
6. Search requests now have an explicit 45-second timeout and `maxRetries: 0` so the bound is real rather than multiplied by automatic retries.
7. Chat-search URL citations are extracted and passed into the Research result instead of being discarded.
8. The existing executor scope remains aligned with Checkpoint 60: normal users use `search:read`; trusted development/admin identities may use `luna:*`.

## Fixes applied in the current work
- `d8250e3c867f7954c0034eb40e99a5cb4ec78107` — fixed live search invocation, added `web_search_options`, explicit timeout/retry bound, and Chat Completions citation extraction.
- `dd4d90d0e24078a2dece612943f8d0e97d6ee64a` — added regression tests for Chat Completions citation extraction.
- `14222541af98cc95d58155d1b64be7759c34e35c` — changed the test-only search diagnostic to exercise the real `HttpSearchProvider` instead of a separate Responses API path.

## Required verification before the final user test
Do not claim the Research path works just because GitHub accepts the commit or Vercel says Ready.

1. Wait for the new Vercel deployment to show `Ready` for the newest `main` commit.
2. Run the test-only diagnostic endpoint in the deployed environment and confirm `ok: true`, a non-zero result count, and usable source URLs when the provider returns citations.
3. Confirm the normal chat path uses the same provider and that the Research Agent no longer falls back to the generic failure message.
4. Only after those checks, ask the user for one final real-world research request.

## Continuity rule
If a new ChatGPT conversation starts with LUNA work, first read `LUNA-CURRENT-STATE.md`, then continue from the active problem above. Do not make the user explain the project again.

## Checkpoints
- Security/action execution baseline: `CHECKPOINT-60.md`
- Earlier central action policy: `CHECKPOINT-59.md`
- Historical checkpoints are preserved; do not roll back unless the user explicitly says `Checkpoint, zurück an Checkpoint`.
