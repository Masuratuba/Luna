import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "authentication required" }, { status: 401 });
  return NextResponse.json({ ok: true, conversations: [] });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.userId) return NextResponse.json({ error: "authentication required" }, { status: 401 });
    return NextResponse.json({ ok: true, conversation: { title: body.title ?? "Neue Unterhaltung" } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
}
