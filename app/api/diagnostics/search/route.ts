import { NextResponse } from "next/server";
import { isLoginBypassed } from "../../../../lib/supabase/mode";
import { getOpenAI } from "../../../../lib/openai";
import { extractSearchResults } from "../../../../lib/providers/http-providers";

export async function GET() {
  if (!isLoginBypassed()) return new NextResponse(null, { status: 404 });
  const model = process.env.OPENAI_SEARCH_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna";
  const query = "Von Tarvisio nach Frankfurt am Main am 20. September 2026, möglichst günstig, egal ob Zug oder Bus. Finde aktuelle Preise, Fahrpläne und verfügbare Verbindungen.";
  try {
    const response = await getOpenAI().responses.create({
      model,
      input: `Use live web search now. Search current transport providers and booking/search pages for this request. Do not answer from general knowledge. Return concrete current findings and source citations.\n\nUser request: ${query}`,
      tools: [{ type: "web_search", search_context_size: "high" }],
      store: false,
    });
    const output = Array.isArray(response.output) ? response.output : [];
    const outputItems = output.map((item: any) => ({
      type: item?.type ?? null,
      role: item?.role ?? null,
      content: Array.isArray(item?.content)
        ? item.content.map((part: any) => ({
            type: part?.type ?? null,
            annotationTypes: Array.isArray(part?.annotations) ? part.annotations.map((annotation: any) => annotation?.type ?? null) : [],
            citationShapes: Array.isArray(part?.annotations)
              ? part.annotations.map((annotation: any) => ({
                  type: annotation?.type ?? null,
                  directUrl: typeof annotation?.url === "string" ? annotation.url : null,
                  nestedUrl: typeof annotation?.url_citation?.url === "string" ? annotation.url_citation.url : null,
                  directTitle: typeof annotation?.title === "string" ? annotation.title : null,
                  nestedTitle: typeof annotation?.url_citation?.title === "string" ? annotation.url_citation.title : null,
                }))
              : [],
          }))
        : [],
    }));
    const extracted = extractSearchResults(response, 5);
    return NextResponse.json({
      ok: true,
      model,
      outputText: response.output_text || "",
      outputItemTypes: outputItems,
      extracted,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number; code?: string };
    return NextResponse.json({ ok: false, model, error: err.message || "unknown error", code: err.code || null }, { status: Number(err.status) >= 400 && Number(err.status) < 600 ? Number(err.status) : 500 });
  }
}
