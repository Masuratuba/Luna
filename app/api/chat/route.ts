import { NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { LUNA_SYSTEM_PROMPT } from "@/lib/luna/prompt";
import { runLunaCore } from "@/lib/luna/core";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const requestedConversationId = typeof body.conversationId === "string" ? body.conversationId : undefined;

    if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "authentication required" }, { status: 401 });

    let conversationId = requestedConversationId;

    if (conversationId) {
      const { data: conversation } = await supabase
        .from("conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!conversation) conversationId = undefined;
    }

    if (!conversationId) {
      const { data: conversation, error } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, title: message.slice(0, 60) })
        .select("id")
        .single();
      if (error) throw error;
      conversationId = conversation.id;
    }

    const { error: messageError } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "user",
      content: message,
    });
    if (messageError) throw messageError;

    const { data: history, error: historyError } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(20);
    if (historyError) throw historyError;

    const core = runLunaCore({ userId: user.id, message, conversationId });
    const response = await getOpenAI().responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.6",
      instructions: LUNA_SYSTEM_PROMPT,
      input: (history ?? []).map((item) => ({ role: item.role, content: item.content })),
    });

    const reply = response.output_text || "Ich konnte gerade keine Antwort erzeugen.";
    const { error: assistantError } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "assistant",
      content: reply,
    });
    if (assistantError) throw assistantError;

    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId)
      .eq("user_id", user.id);

    return NextResponse.json({ ok: true, conversationId, decision: core.decision, reply });
  } catch (error) {
    console.error("Luna chat error", error);
    return NextResponse.json({ error: "Luna could not process the request" }, { status: 500 });
  }
}
