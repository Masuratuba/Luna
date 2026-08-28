import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/supabase/auth";

const BUCKET = "luna-files";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user } = await requireUser();
    const { id } = await params;
    const { data, error } = await supabase.from("files").select("id,name,storage_path,mime_type,size_bytes,metadata,created_at").eq("id", id).eq("user_id", user.id).single();
    if (error || !data) return NextResponse.json({ error: "file not found" }, { status: 404 });
    const signed = await supabase.storage.from(BUCKET).createSignedUrl(data.storage_path, 300);
    if (signed.error) return NextResponse.json({ error: signed.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, file: { ...data, url: signed.data.signedUrl } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
    console.error("File GET error", error);
    return NextResponse.json({ error: "could not load file" }, { status: 500 });
  }
}
