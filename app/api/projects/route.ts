import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/supabase/auth";
import { validateProjectCreate } from "../../../lib/luna/project-validation";

export async function GET(request: Request) {
  try {
    const { supabase, user } = await requireUser(request);
    const { data, error } = await supabase.from("projects").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, projects: data ?? [] });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    console.error("Projects GET error", error);
    return NextResponse.json({ error: "could not load projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser(request);
    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: "invalid request body" }, { status: 400 }); }
    const validation = validateProjectCreate(body);
    if (validation.error || !validation.value) return NextResponse.json({ error: validation.error ?? "invalid project" }, { status: 400 });
    const { name, description, status, metadata } = validation.value;
    const { data, error } = await supabase.from("projects").insert({ user_id: user.id, name, description, status, metadata }).select().single();
    if (error) throw error;
    return NextResponse.json({ ok: true, project: data }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    console.error("Projects POST error", error);
    return NextResponse.json({ error: "could not create project" }, { status: 500 });
  }
}