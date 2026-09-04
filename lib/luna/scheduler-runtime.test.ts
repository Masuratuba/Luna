import assert from "node:assert/strict";
import test from "node:test";
import { runSchedulerRuntimeTick } from "./scheduler-runtime";
import type { SchedulerState } from "./event-scheduler";
import { ExternalTrustedAuthAdapter } from "./trusted-auth";
import { ExecutionBudget } from "./execution-budget";

const firstNow = "2026-09-03T20:00:00.000Z";
const identity = new ExternalTrustedAuthAdapter("scheduler-test").verifyIdentity({
  subject: "user-1",
  role: "user",
  issuer: "scheduler-test",
  issuedAt: 1_000,
  expiresAt: 2_000,
  nonce: "scheduler-nonce",
  scopes: ["task:create"],
}, 1_500)!;

function executionContext(gatewayAuthorized: boolean) {
  return { authenticated: true, userId: "user-1", identity, gatewayAuthorized, budget: new ExecutionBudget() };
}

function dueState(): SchedulerState {
  return {
    tasks: [
      {
        id: "task-1",
        userId: "user-1",
        title: "Run my approved task",
        kind: "reminder",
        status: "scheduled",
        scheduledFor: firstNow,
        createdAt: "2026-09-03T19:00:00.000Z",
        attempts: 0,
        requiresAuthorization: true,
        authorized: true,
      },
    ],
    audit: [],
  };
}

test("runtime retries executor failures with bounded exponential backoff", async () => {
  let current = dueState();
  const result = await runSchedulerRuntimeTick({
    now: firstNow,
    retryBaseDelayMs: 1_000,
    retryMaxDelayMs: 10_000,
    persistence: { load: async () => current, save: async (next) => { current = next; } },
    executionContext: executionContext(true),
    handler: async () => { throw new Error("temporary failure"); },
  });
  assert.equal(result.executed, true);
  assert.equal(result.result?.ok, false);
  assert.equal(result.retryScheduled, true);
  assert.equal(current.tasks[0]?.status, "scheduled");
  assert.equal(current.tasks[0]?.attempts, 1);
  assert.equal(current.tasks[0]?.scheduledFor, "2026-09-03T20:00:01.000Z");
});

test("runtime preserves a stable action id across retries for idempotent handlers", async () => {
  let current = dueState();
  const actionIds: string[] = [];
  let attempts = 0;
  const first = await runSchedulerRuntimeTick({
    now: firstNow,
    retryBaseDelayMs: 0,
    persistence: { load: async () => current, save: async (next) => { current = next; } },
    executionContext: executionContext(true),
    handler: async (action) => { actionIds.push(action.id); attempts += 1; if (attempts === 1) throw new Error("temporary failure"); return { accepted: true }; },
  });
  assert.equal(first.retryScheduled, true);
  const second = await runSchedulerRuntimeTick({
    now: firstNow,
    persistence: { load: async () => current, save: async (next) => { current = next; } },
    executionContext: executionContext(true),
    handler: async (action) => { actionIds.push(action.id); return { accepted: true }; },
  });
  assert.equal(second.result?.ok, true);
  assert.equal(current.tasks[0]?.status, "completed");
  assert.deepEqual(actionIds, ["scheduled:task-1", "scheduled:task-1"]);
});

test("runtime recovers stale running work before selecting the next due task", async () => {
  let current: SchedulerState = { tasks: [{ ...dueState().tasks[0], status: "running", scheduledFor: "2026-09-03T19:00:00.000Z", startedAt: "2026-09-03T19:50:00.000Z", attempts: 1 }], audit: [] };
  const result = await runSchedulerRuntimeTick({
    now: firstNow,
    staleAfterMs: 5 * 60 * 1000,
    persistence: { load: async () => current, save: async (next) => { current = next; } },
    executionContext: executionContext(true),
    handler: async () => ({ ok: true }),
  });
  assert.deepEqual(result.recoveredTaskIds, ["task-1"]);
  assert.equal(result.executed, true);
  assert.equal(current.tasks[0]?.status, "completed");
  assert.equal(current.audit.some((event) => event.type === "task.recovered"), true);
});

test("runtime never claims success when persistence fails during execution", async () => {
  let saveCount = 0;
  const result = await runSchedulerRuntimeTick({
    now: firstNow,
    persistence: { load: async () => dueState(), save: async () => { saveCount += 1; throw new Error("database unavailable"); } },
    executionContext: executionContext(true),
    handler: async () => ({ ok: true }),
  });
  assert.equal(saveCount, 1);
  assert.equal(result.executed, false);
  assert.equal(result.uncertainExecution, true);
  assert.match(result.error ?? "", /database unavailable/);
});

test("runtime remains fail-closed when Guardian Gateway authorization is absent", async () => {
  let current = dueState();
  const result = await runSchedulerRuntimeTick({
    now: firstNow,
    persistence: { load: async () => current, save: async (next) => { current = next; } },
    executionContext: executionContext(false),
    handler: async () => ({ ok: true }),
  });
  assert.equal(result.result?.ok, false);
  assert.equal(result.retryScheduled, true);
  assert.match(current.tasks[0]?.lastError ?? "", /guardian gateway authorization required/);
});
