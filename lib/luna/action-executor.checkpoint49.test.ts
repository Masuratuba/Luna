import assert from "node:assert/strict";
import { test } from "node:test";
import { createAction } from "./core";
import { executeActionSafely } from "./action-executor";

const baseContext = {
  authenticated: true,
  handler: async () => ({ executed: true }),
};

test("executor fails closed when the Guardian gateway has not authorized the action", async () => {
  const action = createAction("task", { title: "test" });
  const result = await executeActionSafely(action, baseContext);

  assert.equal(result.ok, false);
  assert.equal(result.action.status, "failed");
  assert.equal(result.error, "guardian gateway authorization required");
});

test("executor completes only after an authorized handler succeeds", async () => {
  const action = createAction("task", { title: "test" });
  let handlerCalls = 0;
  const result = await executeActionSafely(action, {
    ...baseContext,
    gatewayAuthorized: true,
    handler: async () => {
      handlerCalls += 1;
      return { taskId: "task-1" };
    },
  });

  assert.equal(handlerCalls, 1);
  assert.equal(result.ok, true);
  assert.equal(result.action.status, "completed");
  assert.deepEqual(result.output, { taskId: "task-1" });
});

test("executor marks handler failures as failed and never reports completion", async () => {
  const action = createAction("task", { title: "test" });
  const result = await executeActionSafely(action, {
    ...baseContext,
    gatewayAuthorized: true,
    handler: async () => {
      throw new Error("backend unavailable");
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.action.status, "failed");
  assert.equal(result.error, "backend unavailable");
});
