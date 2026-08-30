import assert from "node:assert/strict";
import test from "node:test";
import { ExternalTrustedAuthAdapter, TrustedAdminContext } from "./trusted-auth";

test("trusted admin context requires a valid external assertion", () => {
  const adapter = new ExternalTrustedAuthAdapter("owner-auth");
  const context = adapter.verify({
    subject: "owner",
    role: "admin",
    issuer: "owner-auth",
    issuedAt: 1_000,
    expiresAt: 2_000,
    nonce: "n-1",
  }, 1_500);
  assert.ok(context instanceof TrustedAdminContext);
  assert.equal(context?.trusted, true);
});

test("expired or foreign assertions are rejected", () => {
  const adapter = new ExternalTrustedAuthAdapter("owner-auth");
  assert.equal(adapter.verify({ subject: "owner", role: "admin", issuer: "owner-auth", issuedAt: 1_000, expiresAt: 2_000, nonce: "n" }, 2_000), null);
  assert.equal(adapter.verify({ subject: "owner", role: "admin", issuer: "other", issuedAt: 1_000, expiresAt: 2_000, nonce: "n" }, 1_500), null);
});
