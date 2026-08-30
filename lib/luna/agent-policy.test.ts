import assert from "node:assert/strict";
import test from "node:test";
import { evaluateAgentPolicy, listAgentPolicies } from "./agent-policy";

test("every registered agent has a technical policy", () => {
  assert.equal(listAgentPolicies().length, 10);
  assert.ok(listAgentPolicies().every((rule) => rule.selfModify === false));
});

test("agents cannot modify Guardian or policy", () => {
  for (const agent of listAgentPolicies()) {
    assert.equal(evaluateAgentPolicy(agent.agent, "guardian.modify", "write").allowed, false);
    assert.equal(evaluateAgentPolicy(agent.agent, "policy.modify", "write").allowed, false);
  }
});

test("research is read-only", () => {
  assert.equal(evaluateAgentPolicy("research", "deep-search", "read").allowed, true);
  assert.equal(evaluateAgentPolicy("research", "catalog.write", "write").allowed, false);
});

test("shop is isolated from wallet and secrets", () => {
  assert.equal(evaluateAgentPolicy("shop", "analytics", "read").allowed, true);
  assert.equal(evaluateAgentPolicy("shop", "wallet.transfer", "execute").allowed, false);
  assert.equal(evaluateAgentPolicy("shop", "secrets.read", "read").allowed, false);
});

test("shop publishing is policy-allowed but approval-gated", () => {
  const result = evaluateAgentPolicy("shop", "store.publish", "execute");
  assert.equal(result.allowed, true);
  assert.equal(result.requiresApproval, true);
});
