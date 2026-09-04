import assert from "node:assert/strict";
import test from "node:test";
import { ExternalTrustedAuthAdapter, TrustedAdminContext, hasTrustedScope, isTrustedIdentityForSubject } from "./trusted-auth";

test("trusted admin context requires a valid external assertion", () => {
  const adapter = new ExternalTrustedAuthAdapter("owner-auth");
  const context = adapter.verify({
    subject: "owner",
    role: "admin",
    issuer: "owner-auth",
    issuedAt: 1_000,
    expiresAt: 2_000,
    nonce: "n-1",
    scopes: ["luna:*"],
  }, 1_500);
  assert.ok(context instanceof TrustedAdminContext);
  assert.equal(context?.trusted, true);
  assert.equal(hasTrustedScope(context!, "luna:*"), true);
});

test("verified user identities carry subject, role and scopes", () => {
  const adapter = new ExternalTrustedAuthAdapter("owner-auth");
  const identity = adapter.verifyIdentity({
    subject: "user-1",
    role: "user",
    issuer: "owner-auth",
    issuedAt: 1_000,
    expiresAt: 2_000,
    nonce: "n-user",
    scopes: ["memory:read", "search:read"],
  }, 1_500);

  assert.equal(identity?.subject, "user-1");
  assert.equal(identity?.role, "user");
  assert.equal(hasTrustedScope(identity!, "search:read"), true);
  assert.equal(isTrustedIdentityForSubject(identity!, "user-1"), true);
  assert.equal(isTrustedIdentityForSubject(identity!, "user-2"), false);
});

test("expired, foreign or scope-invalid assertions are rejected", () => {
  const adapter = new ExternalTrustedAuthAdapter("owner-auth");
  assert.equal(adapter.verify({ subject: "owner", role: "admin", issuer: "owner-auth", issuedAt: 1_000, expiresAt: 2_000, nonce: "n", scopes: ["luna:*"] }, 2_000), null);
  assert.equal(adapter.verify({ subject: "owner", role: "admin", issuer: "other", issuedAt: 1_000, expiresAt: 2_000, nonce: "n", scopes: ["luna:*"] }, 1_500), null);
  assert.equal(adapter.verifyIdentity({ subject: "owner", role: "user", issuer: "owner-auth", issuedAt: 1_000, expiresAt: 2_000, nonce: "n", scopes: [" "] }, 1_500), null);
});
