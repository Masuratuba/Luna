import assert from "node:assert/strict";
import test from "node:test";
import { executeThroughGuardian } from "./guardian-gateway";
import { createAction } from "./core";

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

test("Guardian Gateway keeps critical publishing blocked without confirmation token", async () => {
  const result = await executeThroughGuardian({
    agent: "shop",
    capability: "store.publish",
    mode: "execute",
    action: createAction("tool", { tool: "shop.publish" }),
    context: { authenticated: true, approved: true },
  });
  assert.equal(result.guard.allowed, false);
  assert.equal(result.ok, false);
  assert.match(result.guard.reason, /confirmation/i);
});

test("Guardian Gateway executes a safe action only through its handler", async () => {
  let called = false;
  const result = await executeThroughGuardian({
    agent: "research",
    capability: "search",
    mode: "read",
    action: createAction("tool", { tool: "search" }),
    context: {
      authenticated: true,
      handler: async () => {
        called = true;
        return { result: "verified" };
      },
    },
  });
  assert.equal(result.ok, true);
  assert.equal(called, true);
  assert.equal(result.execution?.action.status, "completed");
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
