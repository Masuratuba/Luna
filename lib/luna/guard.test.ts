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
    scopes: ["luna:*"]
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

test("Guard allows authenticated explicit memory capture", () => {
  const result = evaluateGuard({
    userId: "user-1",
    message: "Merk dir: Ich arbeite an Luna.",
    decision: "SAVE_MEMORY",
  });
  assert.equal(result.allowed, true);
  assert.equal(result.risk, "PROTECTED");
  assert.equal(result.decision, "ALLOW");
});

test("Guard allows authenticated user-owned task creation without a second approval", () => {
  const decision = evaluateGuard({
    userId: "user-1",
    message: "Erstelle eine Aufgabe mit dem Titel \"Luna 001\"",
    decision: "CREATE_TASK",
  });
  assert.equal(decision.allowed, true);
  assert.equal(decision.risk, "PROTECTED");
  assert.equal(decision.decision, "ALLOW");

  const execution = checkGuard({
    action: createAction("task", { title: "Luna 001" }),
    authenticated: true,
  });
  assert.equal(execution.allowed, true);
  assert.equal(execution.risk, "PROTECTED");
  assert.equal(execution.decision, "ALLOW");
});

test("Guard denies destructive task actions unless explicitly confirmed", () => {
  const result = checkGuard({
    action: createAction("task", { destructive: true }),
    authenticated: true,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.risk, "CRITICAL");
  assert.equal(result.decision, "DENY");
});
