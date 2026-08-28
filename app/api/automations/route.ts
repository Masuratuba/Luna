import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/supabase/auth";

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    const { data, error } = await supabase.from("automations").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, automations: data ?? [] });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    console.error("Automations GET error", error);
    return NextResponse.json({ error: "could not load automations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const schedule = typeof body.schedule === "string" ? body.schedule.trim() : "";
    if (!title || !prompt || !schedule) return NextResponse.json({ error: "title, prompt and schedule are required" }, { status: 400 });

    const next = body.next_run_at ? new Date(String(body.next_run_at)) : null;
    if (next && Number.isNaN(next.getTime())) return NextResponse.json({ error: "next_run_at must be a valid ISO date" }, { status: 400 });

    const { data, error } = await supabase.from("automations").insert({ user_id: user.id, title, prompt, schedule, enabled: body.enabled !== false, next_run_at: next?.toISOString() ?? null }).select().single();
    if (error) throw error;
    return NextResponse.json({ ok: true, automation: data }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    console.error("Automations POST error", error);
    return NextResponse.json({ error: "could not create automation" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const patch: Record<string, unknown> = {};
    for (const key of ["title", "prompt", "schedule", "enabled", "next_run_at"]) if (key in body) patch[key] = body[key];
    patch.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from("automations").update(patch).eq("id", body.id).eq("user_id", user.id).select().single();
    if (error) throw error;
    return NextResponse.json({ ok: true, automation: data });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    console.error("Automations PATCH error", error);
    return NextResponse.json({ error: "could not update automation" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const { error } = await supabase.from("automations").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    console.error("Automations DELETE error", error);
    return NextResponse.json({ error: "could not delete automation" }, { status: 500 });
  }
}
