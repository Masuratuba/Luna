import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/supabase/auth";
import { validateProjectUpdate } from "../../../../lib/luna/project-validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { supabase, user } = await requireUser(request);
    const { id } = await params;
    const { data, error } = await supabase.from("projects").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "project not found" }, { status: 404 });
    return NextResponse.json({ ok: true, project: data });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    console.error("Projects GET item error", error);
    return NextResponse.json({ error: "could not load project" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { supabase, user } = await requireUser(request);
    const { id } = await params;
    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: "invalid request body" }, { status: 400 }); }
    const validation = validateProjectUpdate(body);
    if (validation.error || !validation.value) return NextResponse.json({ error: validation.error ?? "invalid project update" }, { status: 400 });
    const { data, error } = await supabase.from("projects").update({ ...validation.value, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id).select().maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "project not found" }, { status: 404 });
    return NextResponse.json({ ok: true, project: data });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    console.error("Projects PATCH error", error);
    return NextResponse.json({ error: "could not update project" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { supabase, user } = await requireUser(request);
    const { id } = await params;
    const { data, error } = await supabase.from("projects").delete().eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "project not found" }, { status: 404 });
    return NextResponse.json({ ok: true, deleted: data.id });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    console.error("Projects DELETE error", error);
    return NextResponse.json({ error: "could not delete project" }, { status: 500 });
  }
}