import assert from "node:assert/strict";
import test from "node:test";
import { consumeApproval, createApproval, resolveApproval, validateApproval } from "./approval";

test("approval tokens are bound to one user and one action", () => {
  const created = createApproval({ id: "approval-1", userId: "user-1", action: "external.send", reason: "send approved message", ttlMs: 60_000 });
  const approved = resolveApproval(created, true, Date.now());
  assert.equal(validateApproval(approved, "user-1", "external.send", approved.token).ok, true);
  assert.equal(validateApproval(approved, "user-2", "external.send", approved.token).ok, false);
  assert.equal(validateApproval(approved, "user-1", "data.delete", approved.token).ok, false);
});

test("consumed approval tokens cannot be reused", () => {
  const created = createApproval({ id: "approval-2", userId: "user-1", action: "external.send", reason: "send approved message", ttlMs: 60_000 });
  const approved = resolveApproval(created, true, Date.now());
  const consumed = consumeApproval(approved, "user-1", "external.send", approved.token, Date.now());
  assert.equal(consumed.status, "consumed");
  assert.equal(validateApproval(consumed, "user-1", "external.send", approved.token).ok, false);
});

test("expired approvals cannot be approved or consumed", () => {
  const created = createApproval({ id: "approval-3", userId: "user-1", action: "external.send", reason: "send approved message", ttlMs: 1 });
  const expired = resolveApproval(created, true, Date.parse(created.expiresAt));
  assert.equal(expired.status, "expired");
  assert.equal(validateApproval(expired, "user-1", "external.send", created.token, Date.now()).ok, false);
});
