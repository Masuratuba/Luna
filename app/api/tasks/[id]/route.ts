import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { supabase, user } = await requireUser();
    const { id } = await params;
    const body = await request.json();
    const allowed = { project_id: body.project_id, title: body.title, description: body.description, status: body.status, priority: body.priority, due_at: body.due_at };
    const update = Object.fromEntries(Object.entries(allowed).filter(([, value]) => value !== undefined));
    const { data, error } = await supabase.from("tasks").update({ ...update, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id).select().single();
    if (error) return NextResponse.json({ error: "task not found" }, { status: 404 });
    return NextResponse.json({ ok: true, task: data });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    return NextResponse.json({ error: "could not update task" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const { supabase, user } = await requireUser();
    const { id } = await params;
    const { error } = await supabase.from("tasks").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    return NextResponse.json({ error: "could not delete task" }, { status: 500 });
  }
}
