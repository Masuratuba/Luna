import assert from "node:assert/strict";
import test from "node:test";
import { createAction } from "./core";
import { checkGuard } from "./guard";
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
