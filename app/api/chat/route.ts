import { NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { LUNA_SYSTEM_PROMPT } from "@/lib/luna/prompt";
import { runLunaCore } from "@/lib/luna/core";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const conversationId = typeof body.conversationId === "string" ? body.conversationId : undefined;
    const userId = typeof body.userId === "string" ? body.userId : "";

    if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });
    if (!userId) return NextResponse.json({ error: "authentication required" }, { status: 401 });

    const core = runLunaCore({ userId, message, conversationId });
    const response = await getOpenAI().responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.6",
      instructions: LUNA_SYSTEM_PROMPT,
      input: message,
    });

    return NextResponse.json({ ok: true, decision: core.decision, reply: response.output_text });
  } catch (error) {
    console.error("Luna chat error", error);
    return NextResponse.json({ error: "Luna could not process the request" }, { status: 500 });
  }
}
