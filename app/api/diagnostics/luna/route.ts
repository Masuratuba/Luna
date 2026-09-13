import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "../../../../lib/supabase/server";
import { isLoginBypassed } from "../../../../lib/supabase/mode";
import { getOpenAI } from "../../../../lib/openai";
import { routeMessage } from "../../../../lib/luna/router";
import { selectAgent, dispatchAgent } from "../../../../lib/luna/agent-orchestrator";
import { extractExplicitMemory } from "../../../../lib/luna/memory";
import { evaluateGuard } from "../../../../lib/luna/guard";
import { ExternalTrustedAuthAdapter } from "../../../../lib/luna/trusted-auth";
import { randomUUID } from "node:crypto";

async function checkTable(supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>, table: string) {
  const { error } = await supabase.from(table).select("id").limit(1);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function GET() {
  if (!isLoginBypassed()) return new NextResponse(null, { status: 404 });

  const result: Record<string, unknown> = {
    testMode: true,
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    openaiKey: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna",
    steps: {},
  };
  const steps = result.steps as Record<string, unknown>;

  try {
    const supabase = createSupabaseServiceClient();
    if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");

    const { data: users, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (usersError) throw new Error(`SUPABASE_AUTH: ${usersError.message}`);
    const userId = users.users[0]?.id;
    steps.auth = { ok: Boolean(userId), userAvailable: Boolean(userId) };
    if (!userId) throw new Error("TEST_USER_NOT_CONFIGURED");

    const issuer = process.env.LUNA_TRUSTED_AUTH_ISSUER?.trim() || "luna-test-mode";
    const now = Date.now();
    const identity = new ExternalTrustedAuthAdapter(issuer).verifyIdentity({
      subject: userId,
      role: "admin",
      issuer,
      issuedAt: now,
      expiresAt: now + 300000,
      nonce: randomUUID(),
      scopes: ["luna:*"]
    });
    steps.identity = { ok: Boolean(identity) };
    if (!identity) throw new Error("AUTH_IDENTITY_INVALID");

    for (const table of ["profiles", "conversations", "messages", "memories", "projects", "tasks", "tool_connections", "luna_actions", "luna_events", "luna_audit_log"]) {
      steps[`table_${table}`] = await checkTable(supabase, table);
    }

    const probe = `LUNA-DIAGNOSTIC-${randomUUID()}`;
    const { data: conversation, error: conversationError } = await supabase.from("conversations").insert({ user_id: userId, title: probe }).select("id").single();
    steps.conversationInsert = conversationError ? { ok: false, error: conversationError.message } : { ok: true };
    if (conversationError || !conversation?.id) throw conversationError ?? new Error("CONVERSATION_INSERT_FAILED");
    const conversationId = conversation.id;

    const { error: userMessageError } = await supabase.from("messages").insert({ conversation_id: conversationId, user_id: userId, role: "user", content: probe });
    steps.userMessageInsert = userMessageError ? { ok: false, error: userMessageError.message } : { ok: true };
    if (userMessageError) throw userMessageError;

    const memoryText = "Merke dir: LUNA-DIAGNOSTIC-MEMORY";
    const memoryContent = extractExplicitMemory(memoryText);
    steps.memoryExtraction = { ok: memoryContent === "LUNA-DIAGNOSTIC-MEMORY", contentExtracted: Boolean(memoryContent) };
    const { data: existingMemory, error: existingMemoryError } = await supabase.from("memories").select("id").eq("user_id", userId).eq("content", memoryContent).maybeSingle();
    if (existingMemoryError) throw existingMemoryError;
    let memoryId = existingMemory?.id;
    if (!memoryId) {
      const { data: memory, error: memoryError } = await supabase.from("memories").insert({ user_id: userId, type: "instruction", content: memoryContent, importance: 1, metadata: { source: "diagnostic" } }).select("id").single();
      if (memoryError) throw memoryError;
      memoryId = memory.id;
    }
    steps.memoryWrite = { ok: Boolean(memoryId), memoryId };

    const taskTitle = "LUNA-DIAGNOSTIC-TASK";
    const { data: task, error: taskError } = await supabase.from("tasks").insert({ user_id: userId, title: taskTitle, status: "todo", priority: 3, description: "diagnostic" }).select("id").single();
    steps.taskWrite = taskError ? { ok: false, error: taskError.message } : { ok: Boolean(task?.id) };
    if (taskError) throw taskError;

    const decision = routeMessage("Merke dir: LUNA-DIAGNOSTIC-MEMORY");
    const agent = selectAgent("Merke dir: LUNA-DIAGNOSTIC-MEMORY", decision);
    const dispatch = dispatchAgent({ agent, task: "Merke dir: LUNA-DIAGNOSTIC-MEMORY" });
    steps.agent = { ok: Boolean(agent), selected: agent, dispatchApproved: dispatch.approved, reason: dispatch.reason };

    const guard = evaluateGuard({ userId, message: "Merke dir: LUNA-DIAGNOSTIC-MEMORY", decision, role: "admin", trustedAdmin: identity });
    steps.guard = { ok: guard.allowed, risk: guard.risk, reason: guard.reason };

    const { data: recentMessages, error: messagesError } = await supabase.from("messages").select("role, content").eq("conversation_id", conversationId).eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
    if (messagesError) throw messagesError;
    steps.messageRead = { ok: true, count: recentMessages?.length ?? 0 };

    const response = await getOpenAI().responses.create({ model: String(result.model), store: false, input: "Reply with exactly OK." });
    steps.openai = { ok: true, reply: response.output_text || "" };

    const { error: assistantError } = await supabase.from("messages").insert({ conversation_id: conversationId, user_id: userId, role: "assistant", content: response.output_text || "OK" });
    steps.assistantMessageInsert = assistantError ? { ok: false, error: assistantError.message } : { ok: true };
    if (assistantError) throw assistantError;

    const { error: updateError } = await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId).eq("user_id", userId);
    steps.conversationUpdate = updateError ? { ok: false, error: updateError.message } : { ok: true };
    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, ...result });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string };
    return NextResponse.json({ ok: false, ...result, error: err.message || "unknown error", code: err.code || null }, { status: Number(err.status) >= 400 && Number(err.status) < 600 ? Number(err.status) : 500 });
  }
}
