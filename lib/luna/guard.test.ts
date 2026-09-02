import assert from "node:assert/strict";
import test from "node:test";
import { createAction } from "./core";
import { checkGuard, evaluateGuard } from "./guard";
import { ExternalTrustedAuthAdapter } from "./trusted-auth";

test("Guardian never trusts a caller-supplied admin boolean", () => {
  const result = checkGuard({
    action: createAction("tool", { tool: "wallet.withdraw" }),
    authenticated: false,
    role: "admin",
    approved: true,
    confirmationToken: "confirmed",
  });
  assert.equal(result.allowed, false);
});

test("Guardian accepts only verifier-created trusted admin context", () => {
  const adapter = new ExternalTrustedAuthAdapter("owner-auth");
  const trustedAdmin = adapter.verify({
    subject: "owner",
    role: "admin",
    issuer: "owner-auth",
    issuedAt: 1_000,
    expiresAt: 2_000,
    nonce: "n-2",
  }, 1_500);
  assert.ok(trustedAdmin);

  const result = checkGuard({
    action: createAction("tool", { tool: "wallet.withdraw" }),
    authenticated: false,
    trustedAdmin,
    approved: true,
    confirmationToken: "confirmed",
  });
  assert.equal(result.allowed, true);
});

test("Guard allows authenticated read-only research requests", () => {
  const result = evaluateGuard({
    userId: "user-1",
    message: "Suche aktuelle Informationen zu OpenAI",
    decision: "USE_TOOL",
  });
  assert.equal(result.allowed, true);
  assert.equal(result.risk, "SAFE");
  assert.equal(result.decision, "ALLOW");
});

test("Guard still blocks protected task requests without approval", () => {
  const result = evaluateGuard({
    userId: "user-1",
    message: "Erstelle eine Aufgabe",
    decision: "CREATE_TASK",
  });
  assert.equal(result.allowed, false);
  assert.equal(result.risk, "PROTECTED");
  assert.equal(result.decision, "REQUIRE_APPROVAL");
});
