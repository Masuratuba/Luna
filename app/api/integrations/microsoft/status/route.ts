import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/supabase/auth";

export async function GET(request: Request) {
  try {
    const { supabase, user } = await requireUser(request);
    const { data, error } = await supabase
      .from("microsoft_connections")
      .select("account_email, scopes, access_token_expires_at, updated_at")
      .eq("user_id", user.id)
      .eq("provider", "microsoft-graph")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ ok: true, connected: false, provider: "microsoft-graph" });
    }

    return NextResponse.json({
      ok: true,
      connected: true,
      provider: "microsoft-graph",
      accountEmail: data.account_email ?? null,
      scopes: Array.isArray(data.scopes) ? data.scopes : [],
      tokenExpiresAt: data.access_token_expires_at ?? null,
      updatedAt: data.updated_at ?? null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "authentication required" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED") {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
    }
    console.error("Microsoft connection status error", error);
    return NextResponse.json({ error: "could not load Microsoft connection status" }, { status: 500 });
  }
}
