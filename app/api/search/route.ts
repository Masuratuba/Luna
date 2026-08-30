import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/supabase/auth";
import { getAgentAccess } from "../../../lib/luna/agent-isolation";
import { createProviderRegistry } from "../../../lib/providers/registry";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
    }

    const query = body && typeof body === "object" && "query" in body && typeof body.query === "string" ? body.query.trim() : "";
    if (!query) return NextResponse.json({ error: "query is required" }, { status: 400 });

    const rawLimit = body && typeof body === "object" && "limit" in body ? body.limit : undefined;
    const limit = typeof rawLimit === "number" && Number.isFinite(rawLimit) ? Math.floor(rawLimit) : undefined;
    if (limit !== undefined && (limit < 1 || limit > 10)) {
      return NextResponse.json({ error: "limit must be between 1 and 10" }, { status: 400 });
    }

    const access = getAgentAccess("research", "search", "read");
    if (!access.allowed) return NextResponse.json({ error: "search capability denied" }, { status: 403 });

    const provider = createProviderRegistry().search();
    const results = await provider.search({ query, ...(limit === undefined ? {} : { limit }) });
    const answer = results[0]?.snippet || "Keine Suchantwort erzeugt.";

    await supabase.from("luna_events").insert({
      user_id: user.id,
      event_type: "search.completed",
      data: { query, provider: provider.name, result_count: results.length },
    });

    return NextResponse.json({ ok: true, query, answer, results, provider: provider.name });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
      if (error.message === "SUPABASE_NOT_CONFIGURED") return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
    }
    console.error("Luna search error", error);
    return NextResponse.json({ error: "search failed" }, { status: 500 });
  }
}
