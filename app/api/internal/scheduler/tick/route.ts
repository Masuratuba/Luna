import { NextResponse } from "next/server";

export const runtime = "nodejs";

function authorized(request: Request): boolean {
  const expected = process.env.SCHEDULER_CRON_SECRET;
  if (!expected) return false;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "SCHEDULER_UNAUTHORIZED" }, { status: 401 });
  }

  return NextResponse.json({
    ok: false,
    status: "not_configured",
    error: "SCHEDULER_HANDLER_NOT_CONFIGURED",
    message: "Scheduler persistence is installed, but no outbound execution handler is enabled yet.",
  }, { status: 503 });
}
