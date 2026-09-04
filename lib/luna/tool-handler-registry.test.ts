import assert from "node:assert/strict";
import test from "node:test";
import { createAction } from "./core";
import { ExecutionBudget } from "./execution-budget";
import { createToolHandlerRegistry } from "./tool-handler-registry";

const context = {
  authenticated: true,
  userId: "user-1",
  budget: new ExecutionBudget(),
};

test("registered tool resolves and executes its handler", async () => {
  const registry = createToolHandlerRegistry();
  registry.register("search", async (action) => ({ query: action.input.query }));

  assert.equal(registry.has("search"), true);
  const result = await registry.execute({
    ...createAction("tool", { tool: "search", query: "Luna" }),
    status: "approved",
  }, context);

  assert.deepEqual(result, { query: "Luna" });
});

test("registered handler receives the trusted execution context", async () => {
  const registry = createToolHandlerRegistry();
  registry.register("mail.read", async (_action, receivedContext) => ({ userId: receivedContext.userId }));

  const result = await registry.execute({
    ...createAction("tool", { tool: "mail.read" }),
    status: "approved",
  }, context);

  assert.deepEqual(result, { userId: "user-1" });
});

test("unknown tool fails closed", async () => {
  const registry = createToolHandlerRegistry();
  await assert.rejects(
    registry.execute({
      ...createAction("tool", { tool: "calendar.write" }),
      status: "approved",
    }, context),
    /TOOL_HANDLER_NOT_REGISTERED:calendar\.write/,
  );
});

test("registry rejects non-tool actions", async () => {
  const registry = createToolHandlerRegistry();
  await assert.rejects(
    registry.execute(createAction("task", { title: "test" }), context),
    /TOOL_ACTION_REQUIRED/,
  );
});

test("blank tool names cannot be registered", () => {
  const registry = createToolHandlerRegistry();
  assert.throws(() => registry.register("  ", async () => ({})), /TOOL_NAME_REQUIRED/);
});
