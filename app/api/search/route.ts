import { NextResponse } from "next/server";
import { getOpenAI } from "../../../lib/openai";
import { requireUser } from "../../../lib/supabase/auth";
import { buildDeepSearchInstructions } from "../../../lib/luna/deep-search";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const body = await request.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (!query) return NextResponse.json({ error: "query is required" }, { status: 400 });

    const model = process.env.OPENAI_SEARCH_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna";
    const response = await getOpenAI().responses.create({
      model,
      instructions: buildDeepSearchInstructions(query),
      tools: [{ type: "web_search", search_context_size: "high" }],
      input: query,
    });
    const answer = response.output_text || "Keine Suchantwort erzeugt.";

    await supabase.from("luna_events").insert({
      user_id: user.id,
      event_type: "search.completed",
      data: { query, model },
    });

    return NextResponse.json({ ok: true, query, answer, model });
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
