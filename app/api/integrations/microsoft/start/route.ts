import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/supabase/auth";
import { createMicrosoftOAuthState, microsoftAuthorizationUrl, microsoftOAuthConfig, microsoftOAuthCookieOptions, microsoftRedirectUri } from "../../../../../lib/integrations/microsoft";

export async function GET(request: Request) {
  try {
    await requireUser(request);
    const { value, cookieValue } = createMicrosoftOAuthState();
    const redirectUri = microsoftRedirectUri(new URL(request.url).origin);
    const response = NextResponse.redirect(microsoftAuthorizationUrl(value, redirectUri));
    response.cookies.set(microsoftOAuthConfig.stateCookie, cookieValue, microsoftOAuthCookieOptions());
    return response;
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.redirect(new URL("/login?error=authentication_required", request.url));
    console.error("Luna Microsoft OAuth start error", error);
    return NextResponse.redirect(new URL("/?microsoft=configuration_error", request.url));
  }
}
