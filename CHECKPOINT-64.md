# Checkpoint 64 — Integration, Policy & Tests

Status: Microsoft Graph OAuth integration implemented; external credentials and database migration still require deployment setup.

## Integrated
- Web capability is preserved through the existing OpenAI search provider.
- Microsoft Graph mail provider is registered and now consumes the authenticated user's server-side Graph token.
- `/api/mail` exposes guarded `search`, `read`, and `send` operations.
- Mail read routes to the research agent; mail send routes to the action agent.
- Mail send is confirmation-gated and requires a non-empty confirmation token.
- Microsoft OAuth authorization-code flow with `offline_access` is implemented.
- OAuth state is signed and short-lived.
- Access and refresh tokens are encrypted at rest with AES-256-GCM before storage in the user-scoped `microsoft_connections` table.
- Expired access tokens are refreshed server-side using the stored refresh token.
- Tokens are never accepted from the browser request body and are never committed to Git.

## Verification
- Added Microsoft OAuth state and token-encryption regression tests.
- Existing provider tests cover Graph 202 Accepted send behavior and fail-closed token handling.
- Existing agent-policy/Guardian regression coverage remains in place.
- No live mailbox access or real email send was performed by repository tests.

## External setup still required
1. In Microsoft Entra, register the exact redirect URI:
   `https://luna-tuba8.vercel.app/api/integrations/microsoft/callback`
2. Create an application client secret and keep it server-side.
3. Set the required Vercel environment variables from `.env.example`.
4. Apply the new Supabase migration `20260905130000_microsoft_mail_connections.sql`.
5. Open `/api/integrations/microsoft/start` while signed into LUNA and complete Microsoft consent.
