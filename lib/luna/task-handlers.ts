import { NextResponse } from "next/server";
import { validateTaskFields, validateTaskTitle } from "./task-validation";

type UserContext = { supabase: any; user: { id: string } };
type RequireUser = (request: Request) => Promise<UserContext>;
type ItemContext = { params: Promise<{ id: string }> };

function unauthorized(error: unknown): boolean {
  return error instanceof Error && error.message === "UNAUTHORIZED";
}

export function createTaskCollectionHandlers(requireUser: RequireUser) {
  async function GET(request: Request): Promise<Response> {
    try {
      const { supabase, user } = await requireUser(request);
      const { data, error } = await supabase.from("tasks").select("*").eq("user_id", user.id)
        .order("due_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return NextResponse.json({ ok: true, tasks: data ?? [] });
    } catch (error) {
      if (unauthorized(error)) return NextResponse.json({ error: "authentication required" }, { status: 401 });
      return NextResponse.json({ error: "could not load tasks" }, { status: 500 });
    }
  }

  async function POST(request: Request): Promise<Response> {
    try {
      const { supabase, user } = await requireUser(request);
      const body: unknown = await request.json();
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return NextResponse.json({ error: "request body must be an object" }, { status: 400 });
      }
      const fields = body as Record<string, unknown>;
      const titleError = validateTaskTitle(fields.title);
      if (titleError) return NextResponse.json({ error: titleError }, { status: 400 });
      const title = (fields.title as string).trim();
      const validationError = validateTaskFields(fields);
      if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

      const { data, error } = await supabase.from("tasks").insert({
        user_id: user.id,
        project_id: fields.project_id ?? null,
        title,
        description: fields.description ?? null,
        status: fields.status ?? "todo",
        priority: fields.priority ?? 3,
        due_at: fields.due_at ?? null,
      }).select().single();
      if (error) throw error;
      return NextResponse.json({ ok: true, task: data }, { status: 201 });
    } catch (error) {
      if (unauthorized(error)) return NextResponse.json({ error: "authentication required" }, { status: 401 });
      return NextResponse.json({ error: "could not create task" }, { status: 500 });
    }
  }
  return { GET, POST };
}

export function createTaskItemHandlers(requireUser: RequireUser) {
  async function PATCH(request: Request, { params }: ItemContext): Promise<Response> {
    try {
      const { supabase, user } = await requireUser(request);
      const { id } = await params;
      const body: unknown = await request.json();
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return NextResponse.json({ error: "request body must be an object" }, { status: 400 });
      }
      const fields = body as Record<string, unknown>;
      if (fields.title !== undefined) {
        if (typeof fields.title !== "string" || !fields.title.trim()) {
          return NextResponse.json({ error: "title must be a non-empty string" }, { status: 400 });
        }
        fields.title = fields.title.trim();
      }
      const validationError = validateTaskFields(fields, true);
      if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

      const allowed = { project_id: fields.project_id, title: fields.title, description: fields.description, status: fields.status, priority: fields.priority, due_at: fields.due_at };
      const update = Object.fromEntries(Object.entries(allowed).filter(([, value]) => value !== undefined));
      if (Object.keys(update).length === 0) {
        return NextResponse.json({ error: "at least one task field is required" }, { status: 400 });
      }
      const { data, error } = await supabase.from("tasks").update({ ...update, updated_at: new Date().toISOString() })
        .eq("id", id).eq("user_id", user.id).select().single();
      if (error) {
        // PostgREST PGRST116 means .single() returned no row; other errors are real failures.
        if (typeof error === "object" && error !== null && "code" in error && error.code === "PGRST116") {
          return NextResponse.json({ error: "task not found" }, { status: 404 });
        }
        throw error;
      }
      return NextResponse.json({ ok: true, task: data });
    } catch (error) {
      if (unauthorized(error)) return NextResponse.json({ error: "authentication required" }, { status: 401 });
      return NextResponse.json({ error: "could not update task" }, { status: 500 });
    }
  }

  async function DELETE(request: Request, { params }: ItemContext): Promise<Response> {
    try {
      const { supabase, user } = await requireUser(request);
      const { id } = await params;
      const { error } = await supabase.from("tasks").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    } catch (error) {
      if (unauthorized(error)) return NextResponse.json({ error: "authentication required" }, { status: 401 });
      return NextResponse.json({ error: "could not delete task" }, { status: 500 });
    }
  }
  return { PATCH, DELETE };
}
