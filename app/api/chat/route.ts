import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { getOpenAI } from "../../../lib/openai";
import { LUNA_SYSTEM_PROMPT } from "../../../lib/luna/prompt";
import { runLunaCore } from "../../../lib/luna/core";
import { executeLunaTool, LUNA_TOOLS } from "../../../lib/luna/tools";

type ChatMessage = { role: "user" | "assistant"; content: string };

async function getAuthenticatedContext() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null };
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user ?? null };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    let conversationId = typeof body.conversationId === "string" && body.conversationId ? body.conversationId : undefined;
    const history = Array.isArray(body.history)
      ? body.history.filter((item: unknown): item is ChatMessage => {
          if (!item || typeof item !== "object") return false;
          const value = item as ChatMessage;
          return (value.role === "user" || value.role === "assistant") && typeof value.content === "string";
        }).slice(-100)
      : [];

    if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

    const { supabase, user } = await getAuthenticatedContext();
    const userId = user?.id ?? "local";
    const core = runLunaCore({ userId, message, conversationId });

    if (user && supabase && !conversationId) {
      const created = await supabase.from("conversations").insert({ user_id: user.id, title: message.slice(0, 100) || "Neue Unterhaltung" }).select("id").single();
      if (!created.error && created.data) conversationId = created.data.id;
    }

    const memoryResult = user && supabase
      ? await supabase.from("memories").select("type, content, importance").eq("user_id", user.id).order("importance", { ascending: false }).order("updated_at", { ascending: false }).limit(30)
      : { data: [] };
    const memories = memoryResult.data ?? [];
    const memoryContext = memories.length
      ? `\n\nRelevant long-term memories (use only when relevant):\n${memories.map((m) => `- [${m.type}; importance ${m.importance}] ${m.content}`).join("\n")}`
      : "";

    const toolInstruction = user && supabase
      ? "You may use the available internal tools when the user asks you to perform an action. Save only stable, useful facts/preferences/instructions as memory; do not save casual conversation or sensitive secrets. Use tools for projects, tasks and automations rather than merely describing how to do them."
      : "The user is not authenticated, so do not claim that you saved memory, projects, tasks or automations. Answer normally and explain that persistence requires login only when relevant.";

    const instructions = `${LUNA_SYSTEM_PROMPT}\n\nCurrent routing decision: ${core.decision}.\n${toolInstruction}${memoryContext}`;
    const input = [...history, { role: "user" as const, content: message }];

    let response: any = await getOpenAI().responses.create({
      model: "gpt-5.6-luna",
      instructions,
      input,
      ...(user && supabase ? { tools: LUNA_TOOLS } : {}),
    });

    // Give LUNA a small, bounded tool loop so actions are actually executed.
    for (let round = 0; round < 3; round += 1) {
      const calls = (response.output ?? []).filter((item: any) => item?.type === "function_call");
      if (!calls.length || !user || !supabase) break;

      const toolOutputs = [];
      for (const call of calls) {
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(call.arguments || "{}"); } catch { args = {}; }
        const result = await executeLunaTool(call.name, args, supabase, user.id);
        toolOutputs.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) });
      }

      response = await getOpenAI().responses.create({
        model: "gpt-5.6-luna",
        instructions,
        input: [...input, ...(response.output ?? []), ...toolOutputs] as any,
        ...(user && supabase ? { tools: LUNA_TOOLS } : {}),
      });
    }

    const reply = response.output_text || "Ich konnte gerade keine Antwort erzeugen.";

    if (user && supabase && conversationId) {
      const rows = [
        { conversation_id: conversationId, user_id: user.id, role: "user", content: message },
        { conversation_id: conversationId, user_id: user.id, role: "assistant", content: reply },
      ];
      const saved = await supabase.from("messages").insert(rows);
      if (saved.error) console.error("Luna message persistence error", saved.error);
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId).eq("user_id", user.id);

      // Backward-compatible explicit memory command. The model's save_memory tool
      // handles natural-language memory automatically; this covers the old syntax.
      if (core.decision === "SAVE_MEMORY") {
        const memoryText = message.replace(/^.*?\b(merke dir|merk dir|speicher(?:e)?|vergiss nicht)\b[:\s-]*/i, "").trim();
        if (memoryText) {
          const existing = await supabase.from("memories").select("id").eq("user_id", user.id).eq("content", memoryText).limit(1);
          if (!existing.data?.length) {
            await supabase.from("memories").insert({ user_id: user.id, type: "fact", content: memoryText, importance: 3, metadata: { source: "chat-explicit" } });
          }
        }
      }
    }

    return NextResponse.json({ ok: true, conversationId: conversationId ?? null, decision: core.decision, reply });
  } catch (error: unknown) {
    console.error("Luna chat error", error);
    const err = error as { message?: string; status?: number; code?: string };
    const status = Number(err?.status);
    return NextResponse.json({ error: "LUNA API-Fehler", detail: err?.message || "Unbekannter Fehler", code: err?.code || null }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}
