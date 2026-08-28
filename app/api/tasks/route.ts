import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/supabase/auth";

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("due_at", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, tasks: data ?? [] });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    console.error("Tasks GET error", error);
    return NextResponse.json({ error: "could not load tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const body = await request.json();
    if (!body.title) return NextResponse.json({ error: "title is required" }, { status: 400 });

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        project_id: body.project_id ?? null,
        title: String(body.title).trim(),
        description: body.description ?? null,
        status: body.status ?? "todo",
        priority: body.priority ?? 3,
        due_at: body.due_at ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, task: data }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    console.error("Tasks POST error", error);
    return NextResponse.json({ error: "could not create task" }, { status: 500 });
  }
}
