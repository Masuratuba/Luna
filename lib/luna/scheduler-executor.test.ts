import assert from "node:assert/strict";
import test from "node:test";
import { runSchedulerTick } from "./scheduler-executor";
import type { SchedulerState } from "./event-scheduler";

const now = "2026-09-03T20:00:00.000Z";

function state(): SchedulerState {
  return {
    tasks: [
      {
        id: "task-1",
        userId: "user-1",
        title: "Run my approved task",
        kind: "reminder",
        status: "scheduled",
        scheduledFor: now,
        createdAt: "2026-09-03T19:00:00.000Z",
        attempts: 0,
        requiresAuthorization: true,
        authorized: true,
      },
    ],
    audit: [],
  };
}

test("scheduler tick persists running state before execution and completes on executor success", async () => {
  let current = state();
  const saves: SchedulerState[] = [];
  let observedRunning = false;

  const result = await runSchedulerTick({
    now,
    persistence: {
      load: async () => current,
      save: async (next) => {
        current = next;
        saves.push(next);
      },
    },
    executionContext: {
      authenticated: true,
      gatewayAuthorized: true,
    },
    handler: async (action) => {
      observedRunning = current.tasks[0]?.status === "running";
      assert.equal(action.input.scheduledTaskId, "task-1");
      return { ok: true };
    },
  });

  assert.equal(result.executed, true);
  assert.equal(result.taskId, "task-1");
  assert.equal(result.result?.ok, true);
  assert.equal(observedRunning, true);
  assert.equal(saves.length, 2);
  assert.equal(current.tasks[0]?.status, "completed");
  assert.equal(current.audit.at(-1)?.type, "task.completed");
});

test("scheduler tick fails closed when the executor is blocked", async () => {
  let current = state();

  const result = await runSchedulerTick({
    now,
    persistence: {
      load: async () => current,
      save: async (next) => {
        current = next;
      },
    },
    executionContext: {
      authenticated: true,
      gatewayAuthorized: false,
    },
    handler: async () => ({ ok: true }),
  });

  assert.equal(result.executed, true);
  assert.equal(result.result?.ok, false);
  assert.equal(current.tasks[0]?.status, "failed");
  assert.match(current.tasks[0]?.lastError ?? "", /guardian gateway authorization required/);
});

test("scheduler tick does nothing when no task is due", async () => {
  const current = state();
  current.tasks[0].scheduledFor = "2026-09-03T21:00:00.000Z";
  let saveCount = 0;

  const result = await runSchedulerTick({
    now,
    persistence: {
      load: async () => current,
      save: async () => {
        saveCount += 1;
      },
    },
    executionContext: { authenticated: true, gatewayAuthorized: true },
    handler: async () => ({ ok: true }),
  });

  assert.equal(result.executed, false);
  assert.equal(result.taskId, null);
  assert.equal(saveCount, 0);
});
