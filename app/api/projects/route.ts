import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "authentication required" }, { status: 401 });
  return NextResponse.json({ ok: true, projects: [] });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.userId || !body.name) {
      return NextResponse.json({ error: "userId and name are required" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, project: body }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
}
