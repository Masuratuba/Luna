import assert from "node:assert/strict";
import test from "node:test";
import { createAction } from "./core";
import { executeActionSafely } from "./action-executor";
import { ExecutionBudget } from "./execution-budget";
import { ExternalTrustedAuthAdapter } from "./trusted-auth";

function identityWithScopes(scopes: string[]) {
  return new ExternalTrustedAuthAdapter("test-auth").verifyIdentity({
    subject: "user-1",
    role: "user",
    issuer: "test-auth",
    issuedAt: 1_000,
    expiresAt: 2_000,
    nonce: `nonce-${scopes.join("-")}`,
    scopes,
  }, 1_500)!;
}

function baseContext(scopes: string[]) {
  return {
    authenticated: true,
    userId: "user-1",
    identity: identityWithScopes(scopes),
    budget: new ExecutionBudget(),
    gatewayAuthorized: true,
    handler: async () => ({ queued: true }),
  };
}

test("mail.send requires its dedicated mail:send scope", async () => {
  const result = await executeActionSafely(
    createAction("tool", { tool: "mail.send" }),
    baseContext(["mail:read"]),
  );

  assert.equal(result.ok, false);
  assert.equal(result.error, "identity scope required: mail:send");
});

test("mail.send requires explicit approval and confirmation token", async () => {
  const action = createAction("tool", { tool: "mail.send" });
  const context = baseContext(["mail:send"]);

  const noApproval = await executeActionSafely(action, context);
  assert.equal(noApproval.ok, false);
  assert.equal(noApproval.error, "critical action blocked without explicit confirmation");

  const approvalWithoutToken = await executeActionSafely(action, { ...context, approved: true });
  assert.equal(approvalWithoutToken.ok, false);
  assert.equal(approvalWithoutToken.error, "confirmation token required");
});

test("mail.send reaches the handler only with scope, approval and confirmation", async () => {
  let calls = 0;
  const result = await executeActionSafely(
    createAction("tool", { tool: "mail.send" }),
    {
      ...baseContext(["mail:send"]),
      approved: true,
      confirmationToken: "confirm-mail-send-1",
      handler: async () => {
        calls += 1;
        return { queued: true };
      },
    },
  );

  assert.equal(result.ok, true);
  assert.equal(calls, 1);
  assert.deepEqual(result.output, { queued: true });
});
