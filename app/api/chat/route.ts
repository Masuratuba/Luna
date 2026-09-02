import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LUNA_SYSTEM_PROMPT } from "../../../lib/luna/prompt";
import { runLunaCore, createAction, createEvent, createAuditEntry } from "../../../lib/luna/core";
import { evaluateGuard } from "../../../lib/luna/guard";
import { extractExplicitMemory } from "../../../lib/luna/memory";
import { executeThroughGuardian } from "../../../lib/luna/guardian-gateway";
import { requireUser } from "../../../lib/supabase/auth";
import { createProviderRegistry } from "../../../lib/providers/registry";
import { getOpenAI } from "../../../lib/openai";

const MAX_CHAT_MESSAGE_CHARS = 20_000;
type LunaSupabaseClient = SupabaseClient;

async function persistEvent(supabase: LunaSupabaseClient, userId: string, event: ReturnType<typeof createEvent>, outcome: "allowed" | "blocked" | "success" | "failure", risk?: string) {
  await Promise.all([
    supabase.from("luna_events").insert({ user_id: userId, event_type: event.type, data: event.data }),
    supabase.from("luna_audit_log").insert({ user_id: userId, event_type: event.type, outcome, risk, data: event.data }),
  ]);
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
    await persistEvent(supabase, user.id, guardEvent, guard.allowed ? "allowed" : "blocked", guard.risk);
    if (!guard.allowed) return NextResponse.json({ ok: false, blocked: true, risk: guard.risk, error: guard.reason }, { status: 403 });

    const history = [...(recentMessages ?? [])].reverse();
    const memoryContext = (memories ?? []).map((memory) => `[${memory.type}] ${memory.content}`).join("\n");
    const searchRequested = core.decision === "USE_TOOL";
    let searchPerformed = false;
    let searchContext = "";
    let actionStatus: "none" | "pending" | "completed" | "failed" = "none";
    let actionError = "";
    let actionOutput: Record<string, unknown> = {};

    if (core.decision === "CREATE_TASK" || core.decision === "SAVE_MEMORY") {
      const explicitMemory = core.decision === "SAVE_MEMORY" ? extractExplicitMemory(message) : null;
      if (core.decision === "SAVE_MEMORY" && !explicitMemory) {
        actionStatus = "failed";
        actionError = "memory request is empty or contains protected secret material";
      } else {
        const actionType = core.decision === "CREATE_TASK" ? "task" : "memory";
        const action = createAction(actionType, {
          message,
          conversationId,
          agent: core.agent,
          ...(core.decision === "CREATE_TASK" ? { title: message.replace(/^\s*(bitte\s+)?(erstelle|erstell|mach|lege|setze)\s+(eine\s+)?(aufgabe|task)\s*[:,-]?\s*/i, "").trim().slice(0, 500) } : {}),
          ...(explicitMemory ? { content: explicitMemory } : {}),
        });
        const { error: actionInsertError } = await supabase.from("luna_actions").insert({ id: action.id, user_id: user.id, type: action.type, status: action.status, input: action.input });
        if (actionInsertError) throw actionInsertError;
        await persistEvent(supabase, user.id, createEvent("action.created", user.id, { actionId: action.id, type: action.type, agent: core.agent }), "allowed", guard.risk);
        actionStatus = "pending";

        const gateway = await executeThroughGuardian({
          agent: core.agent,
          capability: core.decision === "CREATE_TASK" ? "task.create" : "memory.write",
          mode: "write",
          action,
          context: {
            authenticated: true,
            role,
            trustedAdmin,
            executeDomainAction: async (domainAction) => {
              if (domainAction.type === "task") {
                const title = String(domainAction.input.title ?? "").trim();
                if (!title) throw new Error("task title is required");
                const { data, error } = await supabase.from("tasks").insert({ user_id: user.id, title, description: message, status: "todo", priority: 3, due_at: null }).select().single();
                if (error) throw error;
                return { executed: true, type: "task", taskId: data.id };
              }
              if (domainAction.type === "memory") {
                const content = String(domainAction.input.content ?? "").trim();
                if (!content) throw new Error("memory content is required");
                const { data: existing, error: existingError } = await supabase.from("memories").select("id").eq("user_id", user.id).eq("content", content).maybeSingle();
                if (existingError) throw existingError;
                if (existing) return { executed: true, type: "memory", memoryId: existing.id, alreadyExists: true };
                const { data, error } = await supabase.from("memories").insert({ user_id: user.id, type: "instruction", content, importance: 1, metadata: { source: "explicit_user_instruction", saved_via: "chat_action_engine" } }).select("id").single();
                if (error) throw error;
                return { executed: true, type: "memory", memoryId: data.id, alreadyExists: false };
              }
              throw new Error("unsupported domain action");
            },
          },
        });

        if (gateway.execution) {
          actionStatus = gateway.execution.ok ? "completed" : "failed";
          actionError = gateway.execution.error ?? gateway.error ?? "";
          actionOutput = gateway.execution.output ?? {};
          const { error } = await supabase.from("luna_actions").update({ status: gateway.execution.action.status, output: actionOutput }).eq("id", action.id).eq("user_id", user.id);
          if (error) throw error;
        } else {
          actionStatus = "failed";
          actionError = gateway.error ?? "action was not executed";
          const { error } = await supabase.from("luna_actions").update({ status: "failed", output: { error: actionError } }).eq("id", action.id).eq("user_id", user.id);
          if (error) throw error;
        }

        const actionEvent = createEvent(actionStatus === "completed" ? "action.completed" : "action.failed", user.id, { actionId: action.id, type: action.type, status: actionStatus, output: actionOutput, error: actionError || undefined });
        const actionAudit = createAuditEntry(actionEvent, actionStatus === "completed" ? "success" : "failure");
        await persistEvent(supabase, user.id, actionAudit, actionAudit.outcome, guard.risk);
      }
    }

    if (searchRequested) {
      const provider = createProviderRegistry().search();
      const results = await provider.search({ query: message, limit: 5 });
      searchPerformed = results.length > 0;
      searchContext = results.length ? `\n\nVerified research results from ${provider.name}:\n${results.map((result) => `- ${result.title}: ${result.url}\n  ${result.snippet}`).join("\n")}` : "\n\nNo verified search results were returned.";
    }

    const instructions = `${LUNA_SYSTEM_PROMPT}\n\nDecision: ${core.decision}\nAssigned agent: ${core.agent}\nAgent dispatch: ${core.dispatch.reason}\nGuard risk: ${guard.risk}\nAction status: ${actionStatus}\nAction result: ${JSON.stringify(actionOutput)}\nAction error: ${actionError || "(none)"}\n\nRelevant durable memory:\n${memoryContext || "(none)"}\n\nExecution rule: Never claim an action is completed unless Action status is completed. If it is pending or failed, say so clearly. If a memory was saved, acknowledge it. Never claim to remember secrets or credentials.${searchContext}`;
    const response = await getOpenAI().responses.create({ model: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna", instructions, store: false, input: history.map((item) => ({ role: item.role, content: item.content })) });
    const reply = response.output_text || "Ich konnte gerade keine Antwort erzeugen.";

    const { error: assistantMessageError } = await supabase.from("messages").insert({ conversation_id: conversationId, user_id: user.id, role: "assistant", content: reply });
    if (assistantMessageError) throw assistantMessageError;
    const { error: conversationUpdateError } = await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId).eq("user_id", user.id);
    if (conversationUpdateError) throw conversationUpdateError;

    return NextResponse.json({ ok: true, conversationId, decision: core.decision, agent: core.agent, guard: { risk: guard.risk }, actionStatus, actionOutput, actionError: actionError || null, memorySaved: actionOutput.type === "memory" && actionStatus === "completed", searchPerformed, reply });
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
