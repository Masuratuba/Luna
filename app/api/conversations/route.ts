import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/supabase/auth";

function authError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }
  if (error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED") {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }
  console.error("Conversations API error", error);
  return NextResponse.json({ error: "could not process conversations request" }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const { supabase, user } = await requireUser(request);
    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, conversations: data ?? [] });
  } catch (error) {
    return authError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser(request);
    let body: { title?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid request" }, { status: 400 });
    }

    const title = typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 100)
      : "Neue Unterhaltung";
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title })
      .select("id, title, created_at, updated_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, conversation: data }, { status: 201 });
  } catch (error) {
    return authError(error);
  }
}
