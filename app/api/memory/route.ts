import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "authentication required" }, { status: 401 });
  return NextResponse.json({ ok: true, memories: [] });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.userId || !body.content || !body.type) {
      return NextResponse.json({ error: "userId, type and content are required" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, memory: body }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
}
