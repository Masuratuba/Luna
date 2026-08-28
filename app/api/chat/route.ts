import { NextResponse } from "next/server";
import { getOpenAI } from "../../../lib/openai";
import { LUNA_SYSTEM_PROMPT } from "../../../lib/luna/prompt";
import { runLunaCore } from "../../../lib/luna/core";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const conversationId =
      typeof body.conversationId === "string" && body.conversationId
        ? body.conversationId
        : crypto.randomUUID();
    const history = Array.isArray(body.history)
      ? body.history
          .filter(
            (item: unknown): item is ChatMessage =>
              typeof item === "object" &&
              item !== null &&
              ((item as ChatMessage).role === "user" || (item as ChatMessage).role === "assistant") &&
              typeof (item as ChatMessage).content === "string",
          )
          .slice(-20)
      : [];

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const core = runLunaCore({ userId: "local", message, conversationId });
    const input = [
      ...history,
      { role: "user" as const, content: message },
    ];

    const response = await getOpenAI().responses.create({
      model: "gpt-5.6-luna",
      instructions: `${LUNA_SYSTEM_PROMPT}\n\nCurrent routing decision: ${core.decision}.`,
      input,
    });

    const reply = response.output_text || "Ich konnte gerade keine Antwort erzeugen.";
    return NextResponse.json({
      ok: true,
      conversationId,
      decision: core.decision,
      reply,
    });
  } catch (error: unknown) {
    console.error("Luna chat error", error);

    const err = error as { message?: string; status?: number; code?: string };
    const status = Number(err?.status);

    return NextResponse.json(
      {
        error: "LUNA API-Fehler",
        detail: err?.message || "Unbekannter Fehler",
        code: err?.code || null,
      },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
