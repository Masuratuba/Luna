import assert from "node:assert/strict";
import test from "node:test";
import { runLunaCore } from "./core";
import { executeThroughGuardian } from "./guardian-gateway";
import { createToolHandlerRegistry } from "./tool-handler-registry";
import { ExternalTrustedAuthAdapter } from "./trusted-auth";
import { ExecutionBudget } from "./execution-budget";

const identity = new ExternalTrustedAuthAdapter("test-auth").verifyIdentity({
  subject: "user-1",
  role: "user",
  issuer: "test-auth",
  issuedAt: 1_000,
  expiresAt: 2_000,
  nonce: "cp72-core-flow",
  scopes: ["search:read"],
}, 1_500)!;

test("CP72: a research request flows from LUNA Core through agent policy and Guardian to the registered tool", async () => {
  const message = "Recherchiere aktuelle Informationen zu Luna";
  const core = runLunaCore({ userId: "user-1", message, conversationId: "conversation-1" });

  assert.equal(core.decision, "USE_TOOL");
  assert.equal(core.agent, "research");
  assert.equal(core.dispatch.approved, true);

  let handlerCalled = false;
  const registry = createToolHandlerRegistry();
  registry.register("search", async (action) => {
    handlerCalled = true;
    return { query: action.input.query, verified: true };
  });

  const result = await executeThroughGuardian({
    agent: core.agent,
    capability: "search",
    mode: "read",
    action: {
      id: "cp72-action",
      type: "tool",
      status: "pending",
      input: { tool: "search", query: message },
    },
    context: {
      authenticated: true,
      userId: "user-1",
      identity,
      budget: new ExecutionBudget(),
    },
    toolRegistry: registry,
  });

  assert.equal(result.access.allowed, true);
  assert.equal(result.guard.allowed, true);
  assert.equal(result.ok, true);
  assert.equal(handlerCalled, true);
  assert.equal(result.execution?.action.status, "completed");
  assert.deepEqual(result.execution?.output, { query: message, verified: true });
});

test("CP72: the same Core-to-Guardian path fails closed when the tool handler is absent", async () => {
  const message = "Recherchiere aktuelle Informationen zu Luna";
  const core = runLunaCore({ userId: "user-1", message, conversationId: "conversation-2" });

  assert.equal(core.decision, "USE_TOOL");
  assert.equal(core.agent, "research");
  assert.equal(core.dispatch.approved, true);

  const result = await executeThroughGuardian({
    agent: core.agent,
    capability: "search",
    mode: "read",
    action: {
      id: "cp72-action-missing-handler",
      type: "tool",
      status: "pending",
      input: { tool: "search", query: message },
    },
    context: {
      authenticated: true,
      userId: "user-1",
      identity,
      budget: new ExecutionBudget(),
    },
    toolRegistry: createToolHandlerRegistry(),
  });

  assert.equal(result.ok, false);
  assert.equal(result.execution, undefined);
  assert.match(result.error ?? "", /not registered/i);
});
