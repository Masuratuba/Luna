import assert from "node:assert/strict";
import test from "node:test";
import { executeActionSafely } from "./action-executor";
import { ExternalTrustedAuthAdapter } from "./trusted-auth";

function trustedAdmin() {
  const now = Date.now();
  return new ExternalTrustedAuthAdapter("test").verify({
    subject: "user-1",
    role: "admin",
    issuer: "test",
    issuedAt: now,
    expiresAt: now + 60_000,
    nonce: "nonce",
  });
}

test("action executor requires guardian gateway authorization", async () => {
  const result = await executeActionSafely(
    { id: "task-1", type: "task", status: "pending", input: { title: "Test" } },
    { authenticated: true, role: "admin", trustedAdmin: trustedAdmin(), executeDomainAction: async () => ({ executed: true }) },
  );

  assert.equal(result.ok, false);
  assert.equal(result.action.status, "failed");
  assert.match(result.error ?? "", /guardian gateway/i);
});

test("action executor does not complete when domain operation fails", async () => {
  const result = await executeActionSafely(
    { id: "task-2", type: "task", status: "pending", input: { title: "Test" } },
    {
      authenticated: true,
      role: "admin",
      trustedAdmin: trustedAdmin(),
      gatewayAuthorized: true,
      executeDomainAction: async () => {
        throw new Error("database unavailable");
      },
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.action.status, "failed");
});

test("action executor completes only after domain operation succeeds", async () => {
  let executed = false;
  const result = await executeActionSafely(
    { id: "task-3", type: "task", status: "pending", input: { title: "Test" } },
    {
      authenticated: true,
      role: "admin",
      trustedAdmin: trustedAdmin(),
      gatewayAuthorized: true,
      executeDomainAction: async () => {
        executed = true;
        return { executed: true, taskId: "real-task" };
      },
    },
  );

  assert.equal(executed, true);
  assert.equal(result.ok, true);
  assert.equal(result.action.status, "completed");
  assert.equal(result.output?.taskId, "real-task");
});
