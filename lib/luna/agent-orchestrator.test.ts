import assert from "node:assert/strict";
import test from "node:test";
import { dispatchWithCapability, selectAgent } from "./agent-orchestrator";

test("shop tasks route to the isolated Shop Agent", () => {
  assert.equal(selectAgent("analysiere Produkte und Preise", "USE_TOOL"), "shop");
});

test("Shop Agent receives only allow-listed read capabilities", () => {
  const result = dispatchWithCapability(
    { agent: "shop", task: "inspect market data" },
    "analytics",
    "read",
  );

  assert.equal(result.approved, true);
});

test("Shop Agent cannot receive denied capabilities", () => {
  const result = dispatchWithCapability(
    { agent: "shop", task: "access secrets" },
    "secrets.read",
    "read",
  );

  assert.equal(result.approved, false);
});

test("Shop publishing remains approval-gated", () => {
  const result = dispatchWithCapability(
    { agent: "shop", task: "publish product" },
    "store.publish",
    "execute",
  );

  assert.equal(result.approved, false);
  assert.match(result.reason, /approval/i);
});
