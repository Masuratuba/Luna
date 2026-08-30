import assert from "node:assert/strict";
import test from "node:test";
import { buildShopWorkflow, canShopAgentAccess } from "./shop-agent";

test("Shop workflow contains the complete commerce sequence", () => {
  const workflow = buildShopWorkflow();
  assert.equal(workflow.agent, "shop");
  assert.equal(workflow.isolated, true);
  assert.deepEqual(workflow.steps.map((step) => step.id), [
    "discover-products",
    "analyze-demand",
    "analyze-competition",
    "calculate-price",
    "generate-description",
    "update-catalog",
    "publish-store",
  ]);
});

test("Shop Agent publish is approval-gated", () => {
  const access = canShopAgentAccess("store.publish", "execute");
  assert.equal(access.allowed, true);
  assert.equal(access.requiresApproval, true);
});

test("Shop Agent cannot access wallet or secrets", () => {
  assert.equal(canShopAgentAccess("wallet.transfer", "execute").allowed, false);
  assert.equal(canShopAgentAccess("secrets.read", "read").allowed, false);
  assert.equal(canShopAgentAccess("guardian.modify", "write").allowed, false);
});

test("Shop Agent cannot exceed the policy mode", () => {
  assert.equal(canShopAgentAccess("product-research", "execute").allowed, false);
});
