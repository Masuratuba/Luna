import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/supabase/auth";

const TASK_STATUSES = new Set(["todo", "in_progress", "completed", "cancelled"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function isValidDueAt(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && !Number.isNaN(Date.parse(value)));
}

function isValidPriority(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

function validateTaskFields(body: Record<string, unknown>, partial = false): string | null {
  if (!partial || body.project_id !== undefined) {
    if (body.project_id !== null && body.project_id !== undefined && !isUuid(body.project_id)) return "project_id must be a valid UUID or null";
  }
  if (!partial || body.description !== undefined) {
    if (body.description !== null && body.description !== undefined && typeof body.description !== "string") return "description must be a string or null";
  }
  if (!partial || body.status !== undefined) {
    if (body.status !== undefined && (typeof body.status !== "string" || !TASK_STATUSES.has(body.status))) return "status is invalid";
  }
  if (!partial || body.priority !== undefined) {
    if (body.priority !== undefined && !isValidPriority(body.priority)) return "priority must be an integer between 1 and 5";
  }
  if (!partial || body.due_at !== undefined) {
    if (!isValidDueAt(body.due_at ?? null)) return "due_at must be a valid date-time string or null";
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const { supabase, user } = await requireUser(request);
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
    const { supabase, user } = await requireUser(request);
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "request body must be an object" }, { status: 400 });
    }
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
    const validationError = validateTaskFields(body);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        project_id: body.project_id ?? null,
        title,
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
