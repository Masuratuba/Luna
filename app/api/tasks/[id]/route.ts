import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/supabase/auth";

type Params = { params: Promise<{ id: string }> };

const TASK_STATUSES = new Set(["todo", "in_progress", "completed", "cancelled"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function isValidDueAt(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && !Number.isNaN(Date.parse(value)));
}

function validateTaskFields(body: Record<string, unknown>): string | null {
  if (body.project_id !== undefined && body.project_id !== null && !isUuid(body.project_id)) return "project_id must be a valid UUID or null";
  if (body.description !== undefined && body.description !== null && typeof body.description !== "string") return "description must be a string or null";
  if (body.status !== undefined && (typeof body.status !== "string" || !TASK_STATUSES.has(body.status))) return "status is invalid";
  if (body.priority !== undefined && (!Number.isInteger(body.priority) || body.priority < 1 || body.priority > 5)) return "priority must be an integer between 1 and 5";
  if (body.due_at !== undefined && !isValidDueAt(body.due_at)) return "due_at must be a valid date-time string or null";
  return null;
}


export async function PATCH(request: Request, { params }: Params) {
  try {
    const { supabase, user } = await requireUser();
    const { id } = await params;
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "request body must be an object" }, { status: 400 });
    }
    if (body.title !== undefined) {
      if (typeof body.title !== "string" || !body.title.trim()) {
        return NextResponse.json({ error: "title must be a non-empty string" }, { status: 400 });
      }
      body.title = body.title.trim();
    }
    const validationError = validateTaskFields(body);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const allowed = { project_id: body.project_id, title: body.title, description: body.description, status: body.status, priority: body.priority, due_at: body.due_at };
    const update = Object.fromEntries(Object.entries(allowed).filter(([, value]) => value !== undefined));
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "at least one task field is required" }, { status: 400 });
    }

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
