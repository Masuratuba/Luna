import test from "node:test";
import assert from "node:assert/strict";
import { evaluateAgentPolicy } from "./agent-policy";
import { classifyRisk, checkGuard } from "./guard";
import { createAction } from "./core";

test("research agent may read mail but cannot send it", () => {
  assert.equal(evaluateAgentPolicy("research", "mail.read", "read").allowed, true);
  assert.equal(evaluateAgentPolicy("research", "mail.send", "execute").allowed, false);
  assert.equal(evaluateAgentPolicy("action", "mail.send", "execute").allowed, true);
});

test("mail.read is safe while mail.send is critical", () => {
  assert.equal(classifyRisk(createAction("tool", { tool: "mail.read" })), "SAFE");
  const action = createAction("tool", { tool: "mail.send" });
  assert.equal(classifyRisk(action), "CRITICAL");
  const result = checkGuard({ action, authenticated: true });
  assert.equal(result.allowed, false);
  assert.equal(result.decision, "DENY");
  const confirmed = checkGuard({ action, authenticated: true, approved: true, confirmationToken: "confirmation" });
  assert.equal(confirmed.allowed, true);
});
