import { NextResponse } from "next/server";
import { getOpenAI } from "../../../lib/openai";
import { LUNA_SYSTEM_PROMPT } from "../../../lib/luna/prompt";
import { runLunaCore, createAction, createEvent, createAuditEntry } from "../../../lib/luna/core";
import { evaluateGuard } from "../../../lib/luna/guard";
import { extractExplicitMemory } from "../../../lib/luna/memory";
import { requireUser } from "../../../lib/supabase/auth";

export async function POST(request: Request) {
  try {
    const { supabase, user, role, trustedAdmin } = await requireUser(request);
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
      supabase.from("memories").select("type, content, importance").eq("user_id", user.id).order("importance", { ascending: false }).order("updated_at", { ascending: false }).limit(20),
    ]);
    if (messagesError) throw messagesError;
    if (memoryError) throw memoryError;

    const core = runLunaCore({ userId: user.id, message, conversationId });
    const guard = evaluateGuard({ userId: user.id, message, decision: core.decision, role, trustedAdmin });
    const guardEvent = createEvent("guard.checked", user.id, { decision: core.decision, agent: core.agent, agentApproved: core.dispatch.approved, role, trustedAdmin: Boolean(trustedAdmin), risk: guard.risk });
    await supabase.from("luna_events").insert({ user_id: user.id, event_type: guardEvent.type, data: guardEvent.data });
    await supabase.from("luna_audit_log").insert({ user_id: user.id, event_type: guardEvent.type, outcome: guard.allowed ? "allowed" : "blocked", risk: guard.risk, data: guardEvent.data });
    if (!guard.allowed) return NextResponse.json({ ok: false, blocked: true, risk: guard.risk, error: guard.reason }, { status: 403 });

    const explicitMemory = extractExplicitMemory(message);
    let memorySaved = false;
    if (explicitMemory) {
      const { data: existing } = await supabase.from("memories").select("id").eq("user_id", user.id).eq("content", explicitMemory).maybeSingle();
      if (!existing) {
        const { error } = await supabase.from("memories").insert({ user_id: user.id, type: "instruction", content: explicitMemory, importance: 1, metadata: { source: "explicit_user_instruction", saved_via: "chat" } });
        if (error) throw error;
      }
      memorySaved = true;
    }

    const history = [...(recentMessages ?? [])].reverse();
    const memoryContext = (memories ?? []).map((memory) => `[${memory.type}] ${memory.content}`).join("\n");
    const instructions = `${LUNA_SYSTEM_PROMPT}\n\nDecision: ${core.decision}\nAssigned agent: ${core.agent}\nAgent dispatch: ${core.dispatch.reason}\nGuard risk: ${guard.risk}\n\nRelevant durable memory:\n${memoryContext || "(none)"}\n\nMemory rule: If the user explicitly asks you to remember something, acknowledge that it was saved. Never claim to remember secrets or credentials.`;
    const searchRequested = core.decision === "USE_TOOL";
    const response = await getOpenAI().responses.create({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna",
      instructions,
      ...(searchRequested ? { tools: [{ type: "web_search", search_context_size: "high" as const }] } : {}),
      input: history.map((item) => ({ role: item.role, content: item.content })),
    });
    const reply = response.output_text || "Ich konnte gerade keine Antwort erzeugen.";

    if (core.decision === "CREATE_TASK" || core.decision === "USE_TOOL" || core.decision === "SAVE_MEMORY") {
      const actionType = core.decision === "CREATE_TASK" ? "task" : core.decision === "SAVE_MEMORY" ? "memory" : "tool";
      const action = createAction(actionType, { message, conversationId, agent: core.agent, searchRequested, memorySaved });
      await supabase.from("luna_actions").insert({ id: action.id, user_id: user.id, type: action.type, status: action.status, input: action.input });
      const actionEvent = createEvent("action.created", user.id, { actionId: action.id, type: action.type, agent: core.agent });
      await supabase.from("luna_events").insert({ user_id: user.id, event_type: actionEvent.type, data: actionEvent.data });
      await supabase.from("luna_audit_log").insert({ user_id: user.id, event_type: actionEvent.type, outcome: "success", risk: guard.risk, data: actionEvent.data });
    }

    const { error: assistantMessageError } = await supabase.from("messages").insert({ conversation_id: conversationId, user_id: user.id, role: "assistant", content: reply });
    if (assistantMessageError) throw assistantMessageError;
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId).eq("user_id", user.id);

    const completionEvent = createEvent("action.completed", user.id, { conversationId, decision: core.decision, agent: core.agent, searchRequested, memorySaved });
    const completionAudit = createAuditEntry(completionEvent, "success");
    await supabase.from("luna_events").insert({ user_id: user.id, event_type: completionEvent.type, data: completionEvent.data });
    await supabase.from("luna_audit_log").insert({ user_id: user.id, event_type: completionAudit.type, outcome: completionAudit.outcome, risk: guard.risk, data: completionAudit.data });

    return NextResponse.json({ ok: true, conversationId, decision: core.decision, agent: core.agent, guard: { risk: guard.risk }, memorySaved, searchPerformed: searchRequested, reply });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
      if (error.message === "SUPABASE_NOT_CONFIGURED") return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
      if (error.message === "OWNER_AUTH_INVALID") return NextResponse.json({ error: "owner authentication is invalid" }, { status: 503 });
    }
    console.error("Luna chat error", error);
    const err = error as { message?: string; status?: number; code?: string };
    const status = Number(err?.status);
    return NextResponse.json({ error: "LUNA API-Fehler", detail: err?.message || "Unbekannter Fehler", code: err?.code || null }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}
