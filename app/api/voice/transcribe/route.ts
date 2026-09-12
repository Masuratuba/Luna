import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/supabase/auth";
import { getOpenAI } from "../../../../lib/openai";

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    await requireUser(request);
    const form = await request.formData();
    const audio = form.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "audio is required" }, { status: 400 });
    }
    if (audio.size === 0) {
      return NextResponse.json({ error: "audio is empty" }, { status: 400 });
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "audio is too large" }, { status: 413 });
    }

    const transcription = await getOpenAI().audio.transcriptions.create({
      file: audio,
      model: "gpt-4o-mini-transcribe",
      language: "de",
    });

    return NextResponse.json({ ok: true, text: transcription.text?.trim() ?? "" });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "authentication required" }, { status: 401 });
    }
    console.error("Luna voice transcription error", error);
    return NextResponse.json({ error: "Voice-Transkription fehlgeschlagen" }, { status: 500 });
  }
}
