import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/supabase/auth";
import { containsSensitiveMemory, normalizeMemory, type MemoryType } from "../../../lib/luna/memory";

const MEMORY_TYPES = new Set<MemoryType>(["personal", "preference", "project", "decision", "fact", "instruction"]);

function errorResponse(error: unknown, operation: string) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
  if (error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED") return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  console.error(`Memory ${operation} error`, error);
  return NextResponse.json({ error: `could not ${operation} memory` }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 500);
    let builder = supabase
      .from("memories")
      .select("*")
      .eq("user_id", user.id)
      .order("importance", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(50);
    if (query) builder = builder.ilike("content", `%${query}%`);
    const { data, error } = await builder;
    if (error) throw error;
    return NextResponse.json({ ok: true, memories: data ?? [] });
  } catch (error) {
    return errorResponse(error, "load");
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const type = typeof body.type === "string" ? body.type as MemoryType : "";
    const importance = Number(body.importance ?? 0.5);

    if (!content || !type) return NextResponse.json({ error: "type and content are required" }, { status: 400 });
    if (!MEMORY_TYPES.has(type)) return NextResponse.json({ error: "invalid memory type" }, { status: 400 });
    if (containsSensitiveMemory(content)) return NextResponse.json({ error: "sensitive credentials cannot be stored as memory" }, { status: 400 });
    if (!Number.isFinite(importance) || importance < 0 || importance > 1) return NextResponse.json({ error: "importance must be between 0 and 1" }, { status: 400 });

    const normalized = normalizeMemory({ type, content, importance });
    const { data: existing, error: existingError } = await supabase
      .from("memories")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", normalized.type)
      .eq("content", normalized.content)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return NextResponse.json({ ok: true, memory: existing, alreadyPresent: true });

    const { data, error } = await supabase
      .from("memories")
      .insert({ user_id: user.id, type: normalized.type, content: normalized.content, importance: normalized.importance, metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {} })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, memory: data }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "save");
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (body.content !== undefined) {
      if (typeof body.content !== "string" || !body.content.trim()) return NextResponse.json({ error: "content must be a non-empty string" }, { status: 400 });
      if (containsSensitiveMemory(body.content)) return NextResponse.json({ error: "sensitive credentials cannot be stored as memory" }, { status: 400 });
      updates.content = body.content.trim().replace(/\s+/g, " ").slice(0, 10000);
    }
    if (body.type !== undefined) {
      if (typeof body.type !== "string" || !MEMORY_TYPES.has(body.type as MemoryType)) return NextResponse.json({ error: "invalid memory type" }, { status: 400 });
      updates.type = body.type;
    }
    if (body.importance !== undefined) {
      const importance = Number(body.importance);
      if (!Number.isFinite(importance) || importance < 0 || importance > 1) return NextResponse.json({ error: "importance must be between 0 and 1" }, { status: 400 });
      updates.importance = importance;
    }
    if (body.metadata !== undefined) {
      if (!body.metadata || typeof body.metadata !== "object" || Array.isArray(body.metadata)) return NextResponse.json({ error: "metadata must be an object" }, { status: 400 });
      updates.metadata = body.metadata;
    }
    if (!Object.keys(updates).length) return NextResponse.json({ error: "no changes supplied" }, { status: 400 });
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from("memories").update(updates).eq("id", id).eq("user_id", user.id).select().maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "memory not found" }, { status: 404 });
    return NextResponse.json({ ok: true, memory: data });
  } catch (error) {
    return errorResponse(error, "update");
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const { data, error } = await supabase.from("memories").delete().eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "memory not found" }, { status: 404 });
    return NextResponse.json({ ok: true, deleted: data.id });
  } catch (error) {
    return errorResponse(error, "delete");
  }
}
