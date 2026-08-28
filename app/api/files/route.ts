import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/supabase/auth";

const MAX_BYTES = 10 * 1024 * 1024;
const BUCKET = "luna-files";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160) || "file";
}

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    const { data, error } = await supabase.from("files").select("id,name,mime_type,size_bytes,metadata,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return NextResponse.json({ ok: true, files: data ?? [] });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    console.error("Files GET error", error);
    return NextResponse.json({ error: "could not load files" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const form = await request.formData();
    const value = form.get("file");
    if (!(value instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });
    if (value.size > MAX_BYTES) return NextResponse.json({ error: "file is too large (max 10 MB)" }, { status: 413 });

    const path = `${user.id}/${crypto.randomUUID()}-${safeName(value.name)}`;
    const upload = await supabase.storage.from(BUCKET).upload(path, value, { contentType: value.type || "application/octet-stream", upsert: false });
    if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 500 });

    const { data, error } = await supabase.from("files").insert({ user_id: user.id, name: value.name, storage_path: path, mime_type: value.type || null, size_bytes: value.size, metadata: {} }).select("id,name,mime_type,size_bytes,created_at").single();
    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      throw error;
    }
    return NextResponse.json({ ok: true, file: data }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    console.error("Files POST error", error);
    return NextResponse.json({ error: "could not upload file" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const { data, error } = await supabase.from("files").select("storage_path").eq("id", id).eq("user_id", user.id).single();
    if (error || !data) return NextResponse.json({ error: "file not found" }, { status: 404 });
    const removed = await supabase.storage.from(BUCKET).remove([data.storage_path]);
    if (removed.error) throw removed.error;
    const deleted = await supabase.from("files").delete().eq("id", id).eq("user_id", user.id);
    if (deleted.error) throw deleted.error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    console.error("Files DELETE error", error);
    return NextResponse.json({ error: "could not delete file" }, { status: 500 });
  }
}
