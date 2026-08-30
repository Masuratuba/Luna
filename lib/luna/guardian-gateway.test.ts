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

test("Guardian Gateway preserves explicit approval for protected shop publishing", async () => {
  const result = await executeThroughGuardian({
    agent: "shop",
    capability: "store.publish",
    mode: "execute",
    action: createAction("tool", { tool: "shop.publish" }),
    context: { authenticated: true, approved: true },
  });
  assert.equal(result.guard.allowed, true);
  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /provider/i);
});
