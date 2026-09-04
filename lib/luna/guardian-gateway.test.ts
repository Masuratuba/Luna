import assert from "node:assert/strict";
import test from "node:test";
import { executeThroughGuardian } from "./guardian-gateway";
import { createAction } from "./core";
import { createDefaultToolHandlerRegistry } from "./default-tool-handlers";
import { createToolHandlerRegistry } from "./tool-handler-registry";
import { ExternalTrustedAuthAdapter } from "./trusted-auth";
import { ExecutionBudget } from "./execution-budget";

const identity = new ExternalTrustedAuthAdapter("test-auth").verifyIdentity({
  subject: "user-1",
  role: "user",
  issuer: "test-auth",
  issuedAt: 1_000,
  expiresAt: 2_000,
  nonce: "gateway-nonce",
  scopes: ["luna:*"]
}, 1_500)!;

const trustedContext = { authenticated: true, userId: "user-1", identity, budget: new ExecutionBudget() };

test("direct action execution cannot bypass the Guardian Gateway", async () => {
  const { executeActionSafely } = await import("./action-executor");
  const result = await executeActionSafely(createAction("tool", { tool: "external.send" }), { authenticated: true, userId: "user-1", identity, budget: new ExecutionBudget() });
  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /gateway/i);
});

test("Guardian Gateway blocks capabilities outside the agent policy", async () => {
  const result = await executeThroughGuardian({
    agent: "shop",
    capability: "wallet.transfer",
    mode: "execute",
    action: createAction("tool", { tool: "wallet.transfer" }),
    context: trustedContext,
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
    context: { ...trustedContext, approved: true, confirmationToken: "test-confirmation" },
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
    context: trustedContext,
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

test("Guardian Gateway rejects a known tool when its handler is not registered", async () => {
  const registry = createToolHandlerRegistry();
  const result = await executeThroughGuardian({
    agent: "research",
    capability: "search",
    mode: "read",
    action: createAction("tool", { tool: "search" }),
    context: trustedContext,
    toolRegistry: registry,
  });
  assert.equal(result.ok, false);
  assert.equal(result.execution, undefined);
  assert.match(result.error ?? "", /not registered/i);
});

test("an authorized action without a handler never becomes completed", async () => {
  const { executeActionSafely } = await import("./action-executor");
  const result = await executeActionSafely(createAction("tool", { tool: "search" }), {
    ...trustedContext,
    gatewayAuthorized: true,
  });
  assert.equal(result.ok, false);
  assert.equal(result.action.status, "failed");
  assert.match(result.error ?? "", /handler/i);
});

test("Guardian Gateway rejects a mismatched caller subject before execution", async () => {
  let called = false;
  const registry = createToolHandlerRegistry();
  registry.register("search", async () => {
    called = true;
    return { result: "should-not-run" };
  });

  const result = await executeThroughGuardian({
    agent: "research",
    capability: "search",
    mode: "read",
    action: createAction("tool", { tool: "search" }),
    context: { ...trustedContext, userId: "user-2", budget: new ExecutionBudget() },
    toolRegistry: registry,
  });
  assert.equal(result.ok, false);
  assert.equal(called, false);
  assert.match(result.error ?? "", /identity|authentication/i);
});
