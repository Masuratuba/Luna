import { NextResponse } from "next/server";

// Runtime diagnostics are intentionally limited to non-secret error metadata.
// The normal client response remains generic; server logs retain the real error.
function describeError(error: unknown) {
  if (error instanceof Error) return { name: error.name, message: error.message, status: (error as { status?: unknown }).status };
  return { name: "UnknownError", message: String(error), status: undefined };
}

export async function POST(request: Request) {
  try {
    const { requireUser } = await import("../../../lib/supabase/auth");
    const { getOpenAI } = await import("../../../lib/openai");
    const body = await request.json();
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

    const { supabase, user, role, trustedAdmin, identity } = await requireUser(request);
    const { data: conversation, error: conversationError } = await supabase.from("conversations").insert({ user_id: user.id, title: message.slice(0, 80) }).select("id").single();
    if (conversationError) throw conversationError;
    const conversationId = conversation.id;
    const { error: userMessageError } = await supabase.from("messages").insert({ conversation_id: conversationId, user_id: user.id, role: "user", content: message });
    if (userMessageError) throw userMessageError;

    const response = await getOpenAI().responses.create({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna",
      instructions: "You are LUNA Core. Answer the user naturally, accurately and concisely.",
      store: false,
      input: [{ role: "user", content: message }],
    });
    const reply = response.output_text || "Ich konnte gerade keine Antwort erzeugen.";
    const { error: assistantMessageError } = await supabase.from("messages").insert({ conversation_id: conversationId, user_id: user.id, role: "assistant", content: reply });
    if (assistantMessageError) throw assistantMessageError;
    return NextResponse.json({ ok: true, conversationId, role, trustedAdmin: Boolean(trustedAdmin), identity: identity.subject, reply });
  } catch (error: unknown) {
    console.error("Luna chat error", describeError(error));
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
      if (error.message === "SUPABASE_NOT_CONFIGURED") return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
      if (error.message === "OWNER_AUTH_INVALID") return NextResponse.json({ error: "owner authentication is invalid" }, { status: 503 });
      if (error.message === "AUTH_IDENTITY_INVALID") return NextResponse.json({ error: "authenticated identity is invalid" }, { status: 503 });
    }
    const err = error as { status?: number };
    const status = Number(err?.status);
    return NextResponse.json({ error: "LUNA API-Fehler", diagnostic: process.env.NODE_ENV !== "production" ? describeError(error) : undefined }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}
