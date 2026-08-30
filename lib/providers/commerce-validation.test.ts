import assert from "node:assert/strict";
import test from "node:test";
import { parseCommerceAction, validateCommerceProduct, validateCommerceProducts, validatePublishResult } from "./commerce-validation";

test("commerce list action trims bounded query", () => {
  assert.deepEqual(parseCommerceAction({ action: "list", query: "  shoes  " }), { action: "list", query: "shoes" });
});

test("commerce publish requires explicit approval", () => {
  assert.throws(() => parseCommerceAction({ action: "publish", product: { id: "1", title: "Item" }, approval: false }), /COMMERCE_APPROVAL_REQUIRED/);
});

test("commerce product validation rejects unsafe values", () => {
  assert.throws(() => validateCommerceProduct({ id: "1", title: "Item", price: -1 }), /COMMERCE_INVALID_PRICE/);
  assert.throws(() => validateCommerceProduct({ id: "1", title: "Item", url: "http://example.com" }), /COMMERCE_INVALID_URL/);
  assert.throws(() => validateCommerceProduct({ id: "1", title: "Item", currency: "JPY" }), /COMMERCE_INVALID_CURRENCY/);
});

test("commerce response validators reject malformed provider data", () => {
  assert.throws(() => validateCommerceProducts({}), /COMMERCE_INVALID_RESPONSE/);
  assert.throws(() => validatePublishResult({ id: "1" }), /COMMERCE_INVALID_RESPONSE/);
});

test("commerce publish accepts a validated product with approval", () => {
  assert.deepEqual(parseCommerceAction({ action: "publish", approval: true, product: { id: "1", title: "Item", price: 12.5, currency: "eur", url: "https://example.com/item" } }), { action: "publish", approval: true, product: { id: "1", title: "Item", price: 12.5, currency: "EUR", url: "https://example.com/item" } });
});
