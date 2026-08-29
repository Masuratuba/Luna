import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/supabase/auth";

const MEMORY_TYPES = new Set(["personal", "preference", "project", "decision", "fact", "instruction"]);
type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { supabase, user } = await requireUser();
    const { id } = await params;
    const body = await request.json();
    const update: Record<string, unknown> = {};

    if (body.type !== undefined) {
      if (typeof body.type !== "string" || !MEMORY_TYPES.has(body.type)) {
        return NextResponse.json({ error: "invalid memory type" }, { status: 400 });
      }
      update.type = body.type;
    }
    if (body.content !== undefined) {
      if (typeof body.content !== "string" || !body.content.trim()) {
        return NextResponse.json({ error: "content must be a non-empty string" }, { status: 400 });
      }
      update.content = body.content.trim().slice(0, 10000);
    }
    if (body.importance !== undefined) {
      const importance = Number(body.importance);
      if (!Number.isFinite(importance) || importance < 0 || importance > 1) {
        return NextResponse.json({ error: "importance must be between 0 and 1" }, { status: 400 });
      }
      update.importance = importance;
    }
    if (body.metadata !== undefined) {
      if (!body.metadata || typeof body.metadata !== "object") {
        return NextResponse.json({ error: "metadata must be an object" }, { status: 400 });
      }
      update.metadata = body.metadata;
    }

    if (!Object.keys(update).length) {
      return NextResponse.json({ error: "no fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("memories")
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: "memory not found" }, { status: 404 });
    return NextResponse.json({ ok: true, memory: data });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    if (error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED") return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
    console.error("Memory PATCH error", error);
    return NextResponse.json({ error: "could not update memory" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const { supabase, user } = await requireUser();
    const { id } = await params;
    const { error } = await supabase.from("memories").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    if (error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED") return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
    return NextResponse.json({ error: "could not delete memory" }, { status: 500 });
  }
}
