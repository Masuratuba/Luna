import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/supabase/auth";
import { getAgentAccess } from "../../../lib/luna/agent-isolation";
import { createProviderRegistry } from "../../../lib/providers/registry";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const body = await request.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (!query) return NextResponse.json({ error: "query is required" }, { status: 400 });

    const access = getAgentAccess("research", "search", "read");
    if (!access.allowed) return NextResponse.json({ error: "search capability denied" }, { status: 403 });

    const provider = createProviderRegistry().search();
    const results = await provider.search({ query });
    const answer = results[0]?.snippet || "Keine Suchantwort erzeugt.";

    await supabase.from("luna_events").insert({
      user_id: user.id,
      event_type: "search.completed",
      data: { query, provider: provider.name },
    });

    return NextResponse.json({ ok: true, query, answer, results, provider: provider.name });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
      if (error.message === "SUPABASE_NOT_CONFIGURED") return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
    }
    console.error("Luna search error", error);
    const err = error as { message?: string; status?: number };
    const status = Number(err?.status);
    return NextResponse.json({ error: "search failed", detail: err?.message || "Unknown error" }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}
