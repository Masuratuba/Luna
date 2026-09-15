import { NextResponse } from "next/server";
import { isLoginBypassed } from "../../../../lib/supabase/mode";
import { HttpSearchProvider } from "../../../../lib/providers/http-providers";

export async function GET() {
  if (!isLoginBypassed()) return new NextResponse(null, { status: 404 });

  const query = "Von Tarvisio nach Frankfurt am Main am 20. September 2026, möglichst günstig, egal ob Zug oder Bus. Finde aktuelle Preise, Fahrpläne und verfügbare Verbindungen.";
  const startedAt = Date.now();

  try {
    const results = await new HttpSearchProvider().search({ query, limit: 5 });
    return NextResponse.json({
      ok: true,
      model: process.env.OPENAI_SEARCH_MODEL?.trim() || "gpt-5-search-api",
      elapsedMs: Date.now() - startedAt,
      resultCount: results.length,
      results,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number; code?: string; name?: string };
    return NextResponse.json({
      ok: false,
      model: process.env.OPENAI_SEARCH_MODEL?.trim() || "gpt-5-search-api",
      elapsedMs: Date.now() - startedAt,
      error: err.message || "unknown error",
      name: err.name || null,
      code: err.code || null,
      status: Number.isFinite(Number(err.status)) ? Number(err.status) : null,
    }, { status: Number(err.status) >= 400 && Number(err.status) < 600 ? Number(err.status) : 500 });
  }
}
