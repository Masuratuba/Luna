import { NextResponse } from "next/server";
import { getOpenAI } from "../../../lib/openai";
import { LUNA_SYSTEM_PROMPT } from "../../../lib/luna/prompt";
import { runLunaCore } from "../../../lib/luna/core";
import { evaluateGuard } from "../../../lib/luna/guard";
import { requireUser } from "../../../lib/supabase/auth";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const requestedConversationId = typeof body.conversationId === "string" && body.conversationId.trim() ? body.conversationId.trim() : null;
    if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

    let conversationId = requestedConversationId;
    if (conversationId) {
      const { data: conversation, error } = await supabase.from("conversations").select("id").eq("id", conversationId).eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      if (!conversation) return NextResponse.json({ error: "conversation not found" }, { status: 404 });
    } else {
      const { data: conversation, error } = await supabase.from("conversations").insert({ user_id: user.id, title: message.slice(0, 80) || "Neue Unterhaltung" }).select("id").single();
      if (error) throw error;
      conversationId = conversation.id;
    }

    const { error: userMessageError } = await supabase.from("messages").insert({ conversation_id: conversationId, user_id: user.id, role: "user", content: message });
    if (userMessageError) throw userMessageError;

    const [{ data: recentMessages, error: messagesError }, { data: memories, error: memoryError }] = await Promise.all([
      supabase.from("messages").select("role, content").eq("conversation_id", conversationId).eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("memories").select("type, content, importance").eq("user_id", user.id).order("importance", { ascending: false }).order("updated_at", { ascending: false }).limit(12),
    ]);
    if (messagesError) throw messagesError;
    if (memoryError) throw memoryError;

    const core = runLunaCore({ userId: user.id, message, conversationId });
    const guard = evaluateGuard({ userId: user.id, message, decision: core.decision });
    if (!guard.allowed) {
      return NextResponse.json({ ok: false, blocked: true, risk: guard.risk, error: guard.reason }, { status: 403 });
    }

    const history = [...(recentMessages ?? [])].reverse();
    const memoryContext = (memories ?? []).map((memory) => `[${memory.type}] ${memory.content}`).join("\n");
    const instructions = `${LUNA_SYSTEM_PROMPT}\n\nDecision: ${core.decision}\nGuard risk: ${guard.risk}\n\nRelevant durable memory:\n${memoryContext || "(none)"}`;

    const response = await getOpenAI().responses.create({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna",
      instructions,
      input: history.map((item) => ({ role: item.role, content: item.content })),
    });
    const reply = response.output_text || "Ich konnte gerade keine Antwort erzeugen.";

    const { error: assistantMessageError } = await supabase.from("messages").insert({ conversation_id: conversationId, user_id: user.id, role: "assistant", content: reply });
    if (assistantMessageError) throw assistantMessageError;
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId).eq("user_id", user.id);

    return NextResponse.json({ ok: true, conversationId, decision: core.decision, guard: { risk: guard.risk }, reply });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
      if (error.message === "SUPABASE_NOT_CONFIGURED") return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
    }
    console.error("Luna chat error", error);
    const err = error as { message?: string; status?: number; code?: string };
    const status = Number(err?.status);
    return NextResponse.json({ error: "LUNA API-Fehler", detail: err?.message || "Unbekannter Fehler", code: err?.code || null }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}
