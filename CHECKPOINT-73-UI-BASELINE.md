# CP73 — Luna UI Redesign Baseline

Status: **BASELINE CAPTURED — automated status partially verified; no new UI changes included.**

Date: 2026-10-10
Repository: `Masuratuba/Luna`
Baseline branch: `main`
Baseline commit: `3b6a08f89b95943dace288d838d90c852eb3070b`
Production domain: https://luna-luna81.vercel.app/
Production deployment: `dpl_3ogLejWDLyotbB352i2zANQVRhHi`
Deployment state: **READY**
Deployment commit: `3b6a08f89b95943dace288d838d90c852eb3070b`
Vercel commit status: **SUCCESS**
Baseline branch for next work: `checkpoint/cp73-ui-baseline`

## Purpose
Freeze a verified reference point before starting the requested Space + Dark Premium UI work. This checkpoint does not implement the redesign and does not modify production.

## Existing design constraints
- Preserve the existing UI and its functional wiring until a scoped redesign change is reviewed.
- Keep the dark cosmic / starfield atmosphere and Luna orb identity.
- Use the user's selected direction: Design 1 Space + Design 3 Dark Premium, with equal priority for appearance and function.
- Do not replace real data or actions with decorative mock content.
- Do not change authentication, secrets, database schema, API routes, or provider integrations as part of a visual-only change.
- Maintain usable responsive behavior on iPhone and desktop.
- Keep agent selection and the agent-specific chat identity intact.

## Observed frontend baseline
- `app/page.tsx`: top navigation, Luna hero/orb, work cards, chat section, agent cards and capability strip.
- `app/globals.css`: existing dark background, starfield gradients, glass-like cards, responsive breakpoints and chat styling.
- `app/components/LunaChatSecure.tsx`: client chat component with selected agent context, local message state, POST to `/api/chat`, and conversationId state.
- Current stylesheet content matched the file fetched from the historical reference commit `f6997b1cbbb86c8b3c2bf057dbaa6faa64201b46`; therefore the old checkpoint should not be treated as a full source restore target.
- The current frontend is a compact centered layout, not yet the full sidebar + multi-panel dashboard shown in the concept art.

## Current production verification
- GitHub `main` HEAD was read from the GitHub branch API and matches the production deployment's commit SHA.
- Vercel production deployment state is READY and aliases include `luna-luna81.vercel.app`.
- Combined commit status currently reports Vercel SUCCESS.
- This record does **not** assert a fresh GitHub Actions quality workflow result for this exact commit unless separately verified.
- This record does **not** claim live authenticated chat, live Supabase writes, Microsoft OAuth/mail/calendar, scheduler execution or commerce activation were manually verified. See `LUNA-CURRENT-STATE.md`.

## Baseline contents and scope
This branch is cut from the exact current production commit. It contains a copy of the repository state before any new UI redesign changes. No production branch changes are made by this checkpoint.

## Acceptance criteria for CP73 to be marked fully GREEN
1. Re-check TypeScript, lint, tests and production build on the baseline commit (or a no-op documentation-only branch run).
2. Verify deployment commit and READY state remain aligned with the baseline.
3. Keep the known live-integration limitations explicit.
4. Only then begin UI work on a separate feature branch from this baseline.

## Next work (not part of this checkpoint)
Create a separately scoped UI feature branch and implement the approved Space + Dark Premium concept incrementally, preserving existing functionality. Do not merge or deploy until CI and preview review pass.
