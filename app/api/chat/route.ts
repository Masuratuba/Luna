import { NextResponse } from "next/server";
import { LUNA_SYSTEM_PROMPT } from "../../../lib/luna/prompt";
import { runLunaCore, createAction, createEvent, createAuditEntry } from "../../../lib/luna/core";
import { evaluateGuard } from "../../../lib/luna/guard";
import { extractExplicitMemory } from "../../../lib/luna/memory";
import { executeThroughGuardian } from "../../../lib/luna/guardian-gateway";
import { requireUser } from "../../../lib/supabase/auth";
import { createProviderRegistry } from "../../../lib/providers/registry";
import { getOpenAI } from "../../../lib/openai";

const MAX_CHAT_MESSAGE_CHARS = 20_000;

async function persistAction(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  action: ReturnType<typeof createAction>,
  result: { ok: boolean; output?: Record<string, unknown>; error?: string },
  risk: string,
) {
  await supabase.from("luna_actions").update({ status: result.ok ? "completed" : "failed", output: result.output ?? (result.error ? { error: result.error } : null), updated_at: new Date().toISOString() }).eq("id", action.id).eq("user_id", userId);
  const event = createEvent(result.ok ? "action.completed" : "action.created", userId, { actionId: action.id, type: action.type, status: result.ok ? "completed" : "failed", error: result.error ?? null });
  const audit = createAuditEntry(event, result.ok ? "success" : "failure");
  await supabase.from("luna_events").insert({ user_id: userId, event_type: event.type, data: event.data });
  await supabase.from("luna_audit_log").insert({ user_id: userId, event_type: audit.type, outcome: audit.outcome, risk, data: audit.data });
}

async function createPendingAction(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  action: ReturnType<typeof createAction>,
  agent: string,
) {
  await supabase.from("luna_actions").insert({ id: action.id, user_id: userId, type: action.type, status: action.status, input: action.input });
  const event = createEvent("action.created", userId, { actionId: action.id, type: action.type, agent });
  await supabase.from("luna_events").insert({ user_id: userId, event_type: event.type, data: event.data });
  await supabase.from("luna_audit_log").insert({ user_id: userId, event_type: event.type, outcome: "success", data: event.data });
}

export async function POST(request: Request) {
  try {
    const { supabase, user, role, trustedAdmin } = await requireUser(request);
    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const requestedConversationId = typeof body.conversationId === "string" && body.conversationId.trim() ? body.conversationId.trim() : null;
    if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });
    if (message.length > MAX_CHAT_MESSAGE_CHARS) return NextResponse.json({ error: "message is too long" }, { status: 413 });

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

    const history = [...(recentMessages ?? [])].reverse();
    const memoryContext = (memories ?? []).map((memory) => `[${memory.type}] ${memory.content}`).join("\n");
    const actionDecision = core.decision === "CREATE_TASK" || core.decision === "SAVE_MEMORY" || core.decision === "USE_TOOL";
    let actionResult: { ok: boolean; output?: Record<string, unknown>; error?: string } | null = null;
    let actionId: string | null = null;
    let searchPerformed = false;
    let searchContext = "";
    let memorySaved = false;

    if (actionDecision) {
      const actionType = core.decision === "CREATE_TASK" ? "task" : core.decision === "SAVE_MEMORY" ? "memory" : "tool";
      const action = createAction(actionType, { message, conversationId, agent: core.agent });
      actionId = action.id;
      await createPendingAction(supabase, user.id, action, core.agent);

      const explicitMemory = extractExplicitMemory(message);
      const result = await executeThroughGuardian({
        agent: core.agent,
        capability: core.decision === "CREATE_TASK" ? "task.create" : core.decision === "SAVE_MEMORY" ? "memory.write" : "search",
        mode: core.decision === "USE_TOOL" ? "read" : "write",
        action,
        context: { authenticated: true, role, trustedAdmin },
      });

      if (result.execution) actionResult = result.execution;
      else actionResult = { ok: false, error: result.error ?? result.guard.reason };

      if (actionResult.ok && core.decision === "CREATE_TASK") {
        const title = message.replace(/^\s*(bitte\s+)?(erstelle|erstell|mach|lege|setze)\s+(mir\s+)?(eine?\s+)?(aufgabe|task)\s*[:,-]?\s*/i, "").trim().slice(0, 200) || message.slice(0, 200);
        const { data, error } = await supabase.from("tasks").insert({ user_id: user.id, title, status: "todo", priority: 3, description: message }).select("id, title, status").single();
        if (error) actionResult = { ok: false, error: "could not create task" };
        else actionResult = { ok: true, output: { task: data } };
      }

      if (actionResult.ok && core.decision === "SAVE_MEMORY") {
        if (!explicitMemory) {
          actionResult = { ok: false, error: "no safe memory content was found" };
        } else {
          const { data: existing, error: existingError } = await supabase.from("memories").select("id").eq("user_id", user.id).eq("content", explicitMemory).maybeSingle();
          if (existingError) actionResult = { ok: false, error: "could not check memory" };
          else if (!existing) {
            const { error } = await supabase.from("memories").insert({ user_id: user.id, type: "instruction", content: explicitMemory, importance: 1, metadata: { source: "explicit_user_instruction", saved_via: "chat" } });
            if (error) actionResult = { ok: false, error: "could not save memory" };
            else memorySaved = true;
          } else {
            memorySaved = true;
          }
        }
      }

      if (actionResult.ok && core.decision === "USE_TOOL") {
        const results = Array.isArray(actionResult.output?.results) ? actionResult.output.results as Array<{ title: string; url: string; snippet?: string }> : [];
        searchPerformed = results.length > 0;
        searchContext = results.length
          ? `\n\nVerified research results:\n${results.map((result) => `- ${result.title}: ${result.url}\n  ${result.snippet ?? ""}`).join("\n")}`
          : "\n\nNo verified search results were returned.";
      }

      await persistAction(supabase, user.id, action, actionResult, guard.risk);
      if (!actionResult.ok) {
        const failedReply = core.decision === "USE_TOOL" ? "Ich konnte die Recherche gerade nicht verlässlich ausführen." : core.decision === "CREATE_TASK" ? "Ich konnte die Aufgabe nicht ausführen." : "Ich konnte die Erinnerung nicht sicher speichern.";
        await supabase.from("messages").insert({ conversation_id: conversationId, user_id: user.id, role: "assistant", content: failedReply });
        return NextResponse.json({ ok: false, conversationId, decision: core.decision, agent: core.agent, actionId, actionStatus: "failed", error: failedReply }, { status: 502 });
      }
    }

    const instructions = `${LUNA_SYSTEM_PROMPT}\n\nDecision: ${core.decision}\nAssigned agent: ${core.agent}\nAgent dispatch: ${core.dispatch.reason}\nGuard risk: ${guard.risk}\nAction execution: ${actionResult ? (actionResult.ok ? "completed" : "failed") : "not applicable"}\n\nRelevant durable memory:\n${memoryContext || "(none)"}\n\nMemory rule: Never claim to remember secrets or credentials. If an action execution is marked completed, acknowledge the actual completed operation. If no action was executed, do not claim that one was completed.${searchContext}`;
    const response = await getOpenAI().responses.create({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna",
      instructions,
      store: false,
      input: history.map((item) => ({ role: item.role, content: item.content })),
    });
    const reply = response.output_text || "Ich konnte gerade keine Antwort erzeugen.";

    const { error: assistantMessageError } = await supabase.from("messages").insert({ conversation_id: conversationId, user_id: user.id, role: "assistant", content: reply });
    if (assistantMessageError) throw assistantMessageError;
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId).eq("user_id", user.id);

    return NextResponse.json({ ok: true, conversationId, decision: core.decision, agent: core.agent, guard: { risk: guard.risk }, actionId, actionStatus: actionResult?.ok ? "completed" : null, memorySaved, searchPerformed, reply });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
      if (error.message === "SUPABASE_NOT_CONFIGURED") return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
      if (error.message === "OWNER_AUTH_INVALID") return NextResponse.json({ error: "owner authentication is invalid" }, { status: 503 });
    }
    console.error("Luna chat error", error);
    const err = error as { status?: number };
    const status = Number(err?.status);
    return NextResponse.json({ error: "LUNA API-Fehler" }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}
