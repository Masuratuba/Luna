# CHECKPOINT 67 — Microsoft Calendar Capability

Date: 2026-09-06
Repository: `Masuratuba/Luna`
Branch: `main`

## Completed
- Added Microsoft Graph Calendar provider.
- Added guarded `/api/calendar` endpoint with list/read/create/update/delete operations.
- Calendar reads are read-only and use the Research agent.
- Calendar changes use the Action agent and require explicit approval plus confirmationToken.
- Calendar delete is therefore not exposed as an unguarded operation.
- Added `calendar.read` and `calendar.write` to authenticated user scopes and agent capability policy.
- Added calendar permissions to the server-side permission and action-policy layers.
- Registered the calendar provider in the provider registry.
- Extended Microsoft OAuth scopes with `Calendars.ReadWrite` and kept `offline_access` for token renewal.
- Existing encrypted Microsoft connection storage and refresh flow remain the token source; no provider secret is exposed to the agent.

## Verification
- Calendar provider tests passed, including invalid range handling, Graph field mapping, create payload handling and missing-token fail-closed behavior.
- Calendar action-policy regression tests passed: reads are safe; writes require explicit approval.
- GitHub Actions CI run 255 for commit `d233c38ad524d31fb9ba47df12aa172a9672ba51` passed completely:
  - TypeScript
  - ESLint
  - Tests
  - Production build

## Microsoft production note
- The code now requests `Calendars.ReadWrite` during Microsoft OAuth.
- An existing Microsoft connection may need to be re-authorized/reconnected once so the stored refresh token is issued with the calendar scope.
- No additional Supabase table is required for calendar events; Microsoft Graph remains the source of truth for the connected calendar.

## Next
- Reconnect the Microsoft account in the production UI to grant the new calendar permission.
- Then perform a real production calendar read test.
- Only after that should calendar write operations be tested with explicit approval.
