import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const { supabase, user } = await requireUser();
    const { id } = await params;
    const { data, error } = await supabase.from("projects").select("*").eq("id", id).eq("user_id", user.id).single();
    if (error) return NextResponse.json({ error: "project not found" }, { status: 404 });
    return NextResponse.json({ ok: true, project: data });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    return NextResponse.json({ error: "could not load project" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { supabase, user } = await requireUser();
    const { id } = await params;
    const body = await request.json();
    const allowed = { name: body.name, description: body.description, status: body.status, metadata: body.metadata };
    const update = Object.fromEntries(Object.entries(allowed).filter(([, value]) => value !== undefined));
    const { data, error } = await supabase.from("projects").update({ ...update, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id).select().single();
    if (error) return NextResponse.json({ error: "project not found" }, { status: 404 });
    return NextResponse.json({ ok: true, project: data });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    return NextResponse.json({ error: "could not update project" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const { supabase, user } = await requireUser();
    const { id } = await params;
    const { error } = await supabase.from("projects").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    return NextResponse.json({ error: "could not delete project" }, { status: 500 });
  }
}
