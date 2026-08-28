import { NextResponse } from "next/server";
import { getOpenAI } from "../../../lib/openai";
import { LUNA_SYSTEM_PROMPT } from "../../../lib/luna/prompt";
import { runLunaCore } from "../../../lib/luna/core";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const conversationId =
      typeof body.conversationId === "string" && body.conversationId
        ? body.conversationId
        : crypto.randomUUID();

    if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

    const core = runLunaCore({ userId: "local", message, conversationId });
    const response = await getOpenAI().responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      instructions: LUNA_SYSTEM_PROMPT,
      input: [{ role: "user", content: message }],
    });

    const reply = response.output_text || "Ich konnte gerade keine Antwort erzeugen.";
    return NextResponse.json({ ok: true, conversationId, decision: core.decision, reply });
  } catch (error) {
    console.error("Luna chat error", error);
    return NextResponse.json({ error: "Luna could not process the request" }, { status: 500 });
  }
}
