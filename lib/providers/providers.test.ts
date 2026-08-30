import assert from "node:assert/strict";
import test from "node:test";
import { DisabledFinancialProvider } from "./financial-provider";
import { HttpAnalyticsProvider, HttpCommerceProvider, HttpSearchProvider } from "./http-providers";
import { createProviderRegistry } from "./registry";

test("provider registry exposes all five boundaries", () => {
  const registry = createProviderRegistry();
  assert.equal(typeof registry.openai, "function");
  assert.equal(typeof registry.search, "function");
  assert.equal(typeof registry.analytics, "function");
  assert.equal(typeof registry.commerce, "function");
  assert.equal(typeof registry.financial, "function");
});

test("search adapter fails closed when endpoint is absent", async () => {
  await assert.rejects(() => new HttpSearchProvider(undefined).search({ query: "test" }), /SEARCH_PROVIDER_URL/);
});

test("analytics adapter fails closed when endpoint is absent", async () => {
  await assert.rejects(() => new HttpAnalyticsProvider(undefined).measure({ metric: "test" }), /ANALYTICS_PROVIDER_URL/);
});

test("commerce adapter fails closed when endpoint is absent", async () => {
  await assert.rejects(() => new HttpCommerceProvider(undefined).listProducts(), /COMMERCE_PROVIDER_URL/);
});

test("financial adapter cannot move money before explicit integration", async () => {
  const provider = new DisabledFinancialProvider();
  await assert.rejects(() => provider.transfer(), /FINANCIAL_TRANSFER_DISABLED/);
});
