import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/supabase/auth";
import { getOpenAI } from "../../../../lib/openai";

const MAX_TEXT_CHARS = 4096;

export async function POST(request: Request) {
  try {
    await requireUser(request);
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });
    if (text.length > MAX_TEXT_CHARS) return NextResponse.json({ error: "text is too long" }, { status: 413 });

    const speech = await getOpenAI().audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "marin",
      input: text,
      instructions: "Sprich natürlich, ruhig und warm auf Deutsch. Sei klar und nicht unnötig langsam.",
      response_format: "mp3",
    });

    const audio = await speech.arrayBuffer();
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "authentication required" }, { status: 401 });
    }
    console.error("Luna voice speech error", error);
    return NextResponse.json({ error: "Voice-Ausgabe fehlgeschlagen" }, { status: 500 });
  }
}
