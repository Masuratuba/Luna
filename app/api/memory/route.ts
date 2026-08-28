import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/supabase/auth";

export async function GET(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const query = new URL(request.url).searchParams.get("q");
    let builder = supabase.from("memories").select("*").eq("user_id", user.id).order("importance", { ascending: false }).order("updated_at", { ascending: false }).limit(50);
    if (query) builder = builder.ilike("content", `%${query}%`);
    const { data, error } = await builder;
    if (error) throw error;
    return NextResponse.json({ ok: true, memories: data ?? [] });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    console.error("Memory GET error", error);
    return NextResponse.json({ error: "could not load memories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const body = await request.json();
    if (!body.content || !body.type) return NextResponse.json({ error: "type and content are required" }, { status: 400 });
    const { data, error } = await supabase.from("memories").insert({ user_id: user.id, type: body.type, content: body.content, importance: body.importance ?? 3, metadata: body.metadata ?? {} }).select().single();
    if (error) throw error;
    return NextResponse.json({ ok: true, memory: data }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    console.error("Memory POST error", error);
    return NextResponse.json({ error: "could not save memory" }, { status: 500 });
  }
}
