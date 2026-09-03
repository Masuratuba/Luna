import assert from "node:assert/strict";
import test from "node:test";
import {
  applyExecutionResult,
  cancelTask,
  markTaskRunning,
  scheduleTask,
  schedulerTruthRules,
  selectDueTask,
  type SchedulerState,
} from "./event-scheduler";

const NOW = "2026-09-03T18:00:00.000Z";
const DUE = "2026-09-03T19:00:00.000Z";

function state(): SchedulerState {
  return { tasks: [], audit: [] };
}

test("schedules an authorized task and keeps it separate from execution", () => {
  const next = scheduleTask(state(), {
    id: "task-1",
    userId: "u1",
    title: "Call tomorrow",
    kind: "reminder",
    scheduledFor: DUE,
    requiresAuthorization: true,
    authorized: true,
  }, NOW);

  assert.equal(next.tasks[0]?.status, "scheduled");
  assert.equal(next.audit[0]?.type, "task.scheduled");
  assert.equal(selectDueTask(next, NOW), null);
  assert.equal(selectDueTask(next, DUE)?.id, "task-1");
});

test("protected task is fail-closed without explicit authorization", () => {
  const next = scheduleTask(state(), {
    id: "task-2",
    userId: "u1",
    title: "Send message",
    kind: "follow_up",
    scheduledFor: DUE,
    requiresAuthorization: true,
    authorized: false,
  }, NOW);

  assert.equal(next.tasks.length, 0);
  assert.equal(next.audit.length, 0);
});

test("executor success is the only path to completed", () => {
  const scheduled = scheduleTask(state(), {
    id: "task-3",
    userId: "u1",
    title: "Reminder",
    kind: "reminder",
    scheduledFor: DUE,
    requiresAuthorization: false,
  }, NOW);
  const running = markTaskRunning(scheduled, "task-3", DUE);
  const completed = applyExecutionResult(running, "task-3", { ok: true, at: "2026-09-03T19:00:02.000Z" });

  assert.equal(running.tasks[0]?.status, "running");
  assert.equal(completed.tasks[0]?.status, "completed");
  assert.equal(completed.audit.at(-1)?.type, "task.completed");
});

test("executor failure becomes failed and is audited", () => {
  const scheduled = scheduleTask(state(), {
    id: "task-4",
    userId: "u1",
    title: "Reminder",
    kind: "reminder",
    scheduledFor: DUE,
    requiresAuthorization: false,
  }, NOW);
  const running = markTaskRunning(scheduled, "task-4", DUE);
  const failed = applyExecutionResult(running, "task-4", {
    ok: false,
    at: "2026-09-03T19:00:02.000Z",
    error: "executor unavailable",
  });

  assert.equal(failed.tasks[0]?.status, "failed");
  assert.equal(failed.tasks[0]?.lastError, "executor unavailable");
  assert.equal(failed.audit.at(-1)?.type, "task.failed");
});

test("cancelled tasks are never selected", () => {
  const scheduled = scheduleTask(state(), {
    id: "task-5",
    userId: "u1",
    title: "Reminder",
    kind: "reminder",
    scheduledFor: DUE,
    requiresAuthorization: false,
  }, NOW);
  const cancelled = cancelTask(scheduled, "task-5", NOW);

  assert.equal(cancelled.tasks[0]?.status, "cancelled");
  assert.equal(selectDueTask(cancelled, DUE), null);
  assert.equal(cancelled.audit.at(-1)?.type, "task.cancelled");
});

test("truth rules preserve the execution boundary", () => {
  assert.ok(schedulerTruthRules().some((rule) => rule.includes("real executor")));
  assert.ok(schedulerTruthRules().some((rule) => rule.includes("does not send messages")));
});
