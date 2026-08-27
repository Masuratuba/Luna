import { NextResponse } from "next/server";
import { runLunaCore } from "@/lib/luna/core";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const conversationId = typeof body.conversationId === "string" ? body.conversationId : undefined;
    const userId = typeof body.userId === "string" ? body.userId : "";

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "authentication required" }, { status: 401 });
    }

    const result = runLunaCore({ userId, message, conversationId });

    return NextResponse.json({
      ok: true,
      decision: result.decision,
      reply: "Luna Core is ready. AI response integration is the next layer.",
    });
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
}
