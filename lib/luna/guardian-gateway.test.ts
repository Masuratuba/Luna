import assert from "node:assert/strict";
import test from "node:test";
import { executeThroughGuardian } from "./guardian-gateway";
import { createAction } from "./core";
import { createDefaultToolHandlerRegistry } from "./default-tool-handlers";
import { createToolHandlerRegistry } from "./tool-handler-registry";

test("direct action execution cannot bypass the Guardian Gateway", async () => {
  const { executeActionSafely } = await import("./action-executor");
  const result = await executeActionSafely(createAction("tool", { tool: "external.send" }), { authenticated: true });
  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /gateway/i);
});

test("Guardian Gateway blocks capabilities outside the agent policy", async () => {
  const result = await executeThroughGuardian({
    agent: "shop",
    capability: "wallet.transfer",
    mode: "execute",
    action: createAction("tool", { tool: "wallet.transfer" }),
    context: { authenticated: true },
  });
  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /denied|not allowed/i);
});

test("Guardian Gateway preserves explicit approval for protected shop publishing", async () => {
  const result = await executeThroughGuardian({
    agent: "shop",
    capability: "store.publish",
    mode: "execute",
    action: createAction("tool", { tool: "shop.publish" }),
    context: { authenticated: true, approved: true, confirmationToken: "test-confirmation" },
  });
  assert.equal(result.guard.allowed, true);
  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /handler/i);
});

test("Guardian Gateway executes a safe action only through its registered handler", async () => {
  let called = false;
  const registry = createToolHandlerRegistry();
  registry.register("search", async () => {
    called = true;
    return { result: "verified" };
  });

  const result = await executeThroughGuardian({
    agent: "research",
    capability: "search",
    mode: "read",
    action: createAction("tool", { tool: "search" }),
    context: { authenticated: true },
    toolRegistry: registry,
  });
  assert.equal(result.ok, true);
  assert.equal(called, true);
  assert.equal(result.execution?.action.status, "completed");
});

test("default tool registry exposes the concrete search handler", () => {
  const registry = createDefaultToolHandlerRegistry();
  assert.equal(registry.has("search"), true);
  assert.equal(typeof registry.resolve("search"), "function");
  assert.equal(registry.resolve("unknown.tool"), undefined);
});

test("Guardian Gateway requires a registered handler when a tool registry is supplied", async () => {
  const registry = createDefaultToolHandlerRegistry();
  const result = await executeThroughGuardian({
    agent: "research",
    capability: "search",
    mode: "read",
    action: createAction("tool", { tool: "unknown.tool" }),
    context: { authenticated: true },
    toolRegistry: registry,
  });
  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /not registered|not permitted/i);
});

test("an authorized action without a handler never becomes completed", async () => {
  const result = await executeThroughGuardian({
    agent: "research",
    capability: "search",
    mode: "read",
    action: createAction("tool", { tool: "search" }),
    context: { authenticated: true },
  });
  assert.equal(result.ok, false);
  assert.equal(result.execution?.action.status, "failed");
  assert.match(result.error ?? "", /handler/i);
});
