import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ExecutionBudget } from "../../../../../lib/luna/execution-budget";
import { createSchedulerDeliveryHandler } from "../../../../../lib/luna/scheduler-delivery-handler";
import { runSchedulerRuntimeTick } from "../../../../../lib/luna/scheduler-runtime";
import { ExternalTrustedAuthAdapter } from "../../../../../lib/luna/trusted-auth";
import { createSupabaseServiceClient } from "../../../../../lib/supabase/server";

export const runtime = "nodejs";

function authorized(request: Request): boolean {
  const expected = process.env.SCHEDULER_CRON_SECRET?.trim();
  if (!expected) return false;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

function buildIdentity(userId: string) {
  const issuer = process.env.LUNA_TRUSTED_AUTH_ISSUER?.trim() || "luna-scheduler";
  const now = Date.now();
  return new ExternalTrustedAuthAdapter(issuer).verifyIdentity({
    subject: userId,
    role: "user",
    issuer,
    issuedAt: now,
    expiresAt: now + 5 * 60 * 1000,
    nonce: randomUUID(),
    scopes: ["task:create"],
  });
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "SCHEDULER_UNAUTHORIZED" }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "SUPABASE_SERVICE_ROLE_NOT_CONFIGURED" }, { status: 503 });
  }

  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    return NextResponse.json({ ok: false, error: `SCHEDULER_USERS_LOAD_FAILED: ${error.message}` }, { status: 503 });
  }

  const results: Array<Record<string, unknown>> = [];

  for (const user of data.users) {
    const identity = buildIdentity(user.id);
    if (!identity) {
      results.push({ userId: user.id, executed: false, error: "AUTH_IDENTITY_INVALID" });
      continue;
    }

    const budget = new ExecutionBudget({ maxToolCalls: 1, maxActions: 5 });
    const persistence = (await import("../../../../../lib/luna/supabase-scheduler-persistence")).createSupabaseSchedulerPersistence(user.id);

    const result = await runSchedulerRuntimeTick({
      persistence,
      handler: createSchedulerDeliveryHandler(supabase),
      executionContext: {
        authenticated: true,
        userId: user.id,
        role: "user",
        identity,
        budget,
      },
    });

    results.push({
      userId: user.id,
      taskId: result.taskId,
      executed: result.executed,
      ok: result.result?.ok ?? null,
      retryScheduled: result.retryScheduled,
      uncertainExecution: result.uncertainExecution ?? false,
      error: result.error ?? result.result?.error ?? null,
    });
  }

  const executed = results.filter((item) => item.executed === true).length;
  const failures = results.filter((item) => item.error).length;

  return NextResponse.json({
    ok: failures === 0,
    status: failures === 0 ? "completed" : "completed_with_errors",
    usersChecked: results.length,
    executed,
    failures,
    results,
  }, { status: failures === 0 ? 200 : 207 });
}
