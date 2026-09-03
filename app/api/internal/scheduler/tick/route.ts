import { NextResponse } from "next/server";
import { createSupabaseSchedulerPersistence } from "@/lib/luna/supabase-scheduler-persistence";
import { runControlledSchedulerTrigger } from "@/lib/luna/scheduler-trigger";

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

  const userId = request.headers.get("x-luna-user-id")?.trim();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "SCHEDULER_USER_ID_REQUIRED" }, { status: 400 });
  }

  try {
    const persistence = createSupabaseSchedulerPersistence(userId);
    const result = await runControlledSchedulerTrigger({
      persistence,
      handler: async () => {
        throw new Error("SCHEDULER_HANDLER_NOT_CONFIGURED");
      },
      executionContext: {
        userId,
        approved: false,
      },
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "SCHEDULER_TRIGGER_FAILED" },
      { status: 500 },
    );
  }
}
