import assert from "node:assert/strict";
import test from "node:test";
import { createAction } from "./core";
import { createToolHandlerRegistry } from "./tool-handler-registry";

test("registered tool resolves and executes its handler", async () => {
  const registry = createToolHandlerRegistry();
  registry.register("search", async (action) => ({ query: action.input.query }));

  assert.equal(registry.has("search"), true);
  const result = await registry.execute({
    ...createAction("tool", { tool: "search", query: "Luna" }),
    status: "approved",
  });

  assert.deepEqual(result, { query: "Luna" });
});

test("unknown tool fails closed", async () => {
  const registry = createToolHandlerRegistry();
  await assert.rejects(
    registry.execute({
      ...createAction("tool", { tool: "calendar.write" }),
      status: "approved",
    }),
    /TOOL_HANDLER_NOT_REGISTERED:calendar\.write/,
  );
});

test("registry rejects non-tool actions", async () => {
  const registry = createToolHandlerRegistry();
  await assert.rejects(
    registry.execute(createAction("task", { title: "test" })),
    /TOOL_ACTION_REQUIRED/,
  );
});

test("blank tool names cannot be registered", () => {
  const registry = createToolHandlerRegistry();
  assert.throws(() => registry.register("  ", async () => ({})), /TOOL_NAME_REQUIRED/);
});
