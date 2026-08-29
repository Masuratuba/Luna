import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/supabase/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const { supabase, user } = await requireUser();
    const { id } = await params;

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id, title, created_at, updated_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (conversationError) throw conversationError;
    if (!conversation) return NextResponse.json({ error: "conversation not found" }, { status: 404 });

    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (messagesError) throw messagesError;
    return NextResponse.json({ ok: true, conversation, messages: messages ?? [] });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    if (error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED") return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
    console.error("Conversation GET error", error);
    return NextResponse.json({ error: "could not load conversation" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: Params }) {
  try {
    const { supabase, user } = await requireUser();
    const { id } = await params;
    const { error } = await supabase.from("conversations").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    if (error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED") return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
    console.error("Conversation DELETE error", error);
    return NextResponse.json({ error: "could not delete conversation" }, { status: 500 });
  }
}
