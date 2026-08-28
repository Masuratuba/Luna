import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/supabase/auth";

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
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
    const { supabase, user } = await requireUser();
    const body = await request.json();
    if (!body.name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: String(body.name).trim(),
        description: body.description ?? null,
        status: body.status ?? "active",
        metadata: body.metadata ?? {},
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, project: data }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    console.error("Projects POST error", error);
    return NextResponse.json({ error: "could not create project" }, { status: 500 });
  }
}
