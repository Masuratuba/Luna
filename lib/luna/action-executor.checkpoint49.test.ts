import assert from "node:assert/strict";
import { test } from "node:test";
import { createAction } from "./core";
import { executeActionSafely } from "./action-executor";
import { ExternalTrustedAuthAdapter } from "./trusted-auth";

const adapter = new ExternalTrustedAuthAdapter("test-auth");
const identity = adapter.verifyIdentity({
  subject: "user-1",
  role: "user",
  issuer: "test-auth",
  issuedAt: 1_000,
  expiresAt: 2_000,
  nonce: "test-nonce",
  scopes: ["luna:execute", "search:read"],
}, 1_500)!;

const baseContext = {
  authenticated: true,
  userId: "user-1",
  identity,
  handler: async () => ({ executed: true }),
};

test("executor fails closed when the Guardian gateway has not authorized the action", async () => {
  const action = createAction("tool", { tool: "search" });
  const result = await executeActionSafely(action, baseContext);

  assert.equal(result.ok, false);
  assert.equal(result.action.status, "failed");
  assert.equal(result.error, "guardian gateway authorization required");
});

test("executor fails closed when a trusted identity is missing", async () => {
  const action = createAction("tool", { tool: "search" });
  const result = await executeActionSafely(action, {
    ...baseContext,
    identity: undefined,
    gatewayAuthorized: true,
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "trusted identity required");
});

test("executor fails closed when the caller subject does not match the trusted identity", async () => {
  const action = createAction("tool", { tool: "search" });
  const result = await executeActionSafely(action, {
    ...baseContext,
    userId: "user-2",
    gatewayAuthorized: true,
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "trusted identity required");
});

test("executor completes only after an authorized handler succeeds", async () => {
  const action = createAction("tool", { tool: "search" });
  let handlerCalls = 0;
  const result = await executeActionSafely(action, {
    ...baseContext,
    gatewayAuthorized: true,
    handler: async () => {
      handlerCalls += 1;
      return { searchResults: 1 };
    },
  });

  assert.equal(handlerCalls, 1);
  assert.equal(result.ok, true);
  assert.equal(result.action.status, "completed");
  assert.deepEqual(result.output, { searchResults: 1 });
});

test("executor marks handler failures as failed and never reports completion", async () => {
  const action = createAction("tool", { tool: "search" });
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
