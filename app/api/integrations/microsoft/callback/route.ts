import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "../../../../../lib/supabase/auth";
import { exchangeMicrosoftCode, microsoftOAuthConfig, saveMicrosoftConnection, verifyMicrosoftOAuthState } from "../../../../../lib/integrations/microsoft";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    if (error) return NextResponse.redirect(new URL("/?microsoft=cancelled", url.origin));
    if (!code || !state) return NextResponse.redirect(new URL("/?microsoft=missing_code", url.origin));

    const cookieStore = await cookies();
    const stateCookie = cookieStore.get(microsoftOAuthConfig.stateCookie)?.value;
    if (!verifyMicrosoftOAuthState(state, stateCookie)) return NextResponse.redirect(new URL("/?microsoft=invalid_state", url.origin));

    const { user } = await requireUser(request);
    const token = await exchangeMicrosoftCode(code);
    await saveMicrosoftConnection(user.id, token);

    const response = NextResponse.redirect(new URL("/?microsoft=connected", url.origin));
    response.cookies.delete(microsoftOAuthConfig.stateCookie);
    return response;
  } catch (error: unknown) {
    console.error("Luna Microsoft OAuth callback error", error);
    return NextResponse.redirect(new URL("/?microsoft=connection_failed", url.origin));
  }
}
