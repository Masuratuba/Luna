import test from "node:test";
import assert from "node:assert/strict";
import { evaluateActionPolicy } from "./action-policy";
import { createAction } from "./core";

test("policy allows authenticated read-only search", () => {
  const result = evaluateActionPolicy(createAction("tool", { tool: "search" }), { authenticated: true });
  assert.equal(result.allowed, true);
  assert.equal(result.risk, "safe");
});

test("policy denies unauthenticated actions", () => {
  const result = evaluateActionPolicy(createAction("tool", { tool: "search" }), { authenticated: false });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "authentication required");
});

test("policy fails closed for unknown tools", () => {
  const result = evaluateActionPolicy(createAction("tool", { tool: "unknown.tool" }), { authenticated: true });
  assert.equal(result.allowed, false);
  assert.equal(result.risk, "destructive");
});

test("destructive tools require explicit approval", () => {
  const action = createAction("tool", { tool: "external.send" });
  assert.equal(evaluateActionPolicy(action, { authenticated: true }).allowed, false);
  assert.equal(evaluateActionPolicy(action, { authenticated: true, approved: true }).allowed, true);
});

test("protected shop publishing requires explicit approval", () => {
  const action = createAction("tool", { tool: "shop.publish" });
  const denied = evaluateActionPolicy(action, { authenticated: true });
  assert.equal(denied.allowed, false);
  assert.equal(denied.requiresConfirmation, true);
  assert.equal(denied.risk, "destructive");
  assert.equal(denied.reason, "explicit confirmation required");

  const approved = evaluateActionPolicy(action, { authenticated: true, approved: true });
  assert.equal(approved.allowed, true);
  assert.equal(approved.risk, "destructive");
});

test("blank tool names fail closed", () => {
  const result = evaluateActionPolicy(createAction("tool", { tool: "   " }), { authenticated: true });
  assert.equal(result.allowed, false);
});
