import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/supabase/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { supabase, user } = await requireUser();
    const { data, error } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) throw error;
    return NextResponse.json({ ok: true, messages: data ?? [] });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "authentication required" }, { status: 401 });
    }
    console.error("Conversation messages GET error", error);
    return NextResponse.json({ error: "could not load messages" }, { status: 500 });
  }
}
