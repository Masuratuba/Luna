import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createOwnerSession, OWNER_SESSION_COOKIE, OWNER_SESSION_MAX_AGE } from "../../../lib/supabase/owner-session";
import { createSupabaseServiceClient } from "../../../lib/supabase/server";

export const runtime = "nodejs";

function matches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const secret = process.env.LUNA_OWNER_SECRET;
  const userId = process.env.LUNA_OWNER_USER_ID;
  if (!secret || !userId || !createSupabaseServiceClient()) {
    return NextResponse.json({ error: "Anmeldung ist serverseitig nicht vollständig konfiguriert." }, { status: 503 });
  }

  let password = "";
  try {
    const body = await request.json() as { password?: unknown };
    if (typeof body.password === "string") password = body.password;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  if (!password || !matches(password, secret)) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return NextResponse.json({ error: "Passwort stimmt nicht." }, { status: 401 });
  }

  const token = await createOwnerSession(userId, secret);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(OWNER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OWNER_SESSION_MAX_AGE,
  });
  return response;
}
