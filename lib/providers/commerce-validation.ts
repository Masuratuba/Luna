import type { CommerceProduct } from "./contracts";

const MAX_TITLE_LENGTH = 200;
const MAX_QUERY_LENGTH = 200;
const MAX_PRICE = 1_000_000;
const CURRENCIES = new Set(["EUR", "USD", "GBP", "CHF"]);

export type CommerceAction = Readonly<{ action: "list"; query?: string }> | Readonly<{ action: "publish"; product: CommerceProduct; approval: true }>;

export function parseCommerceAction(input: unknown): CommerceAction {
  if (!input || typeof input !== "object") throw new Error("COMMERCE_INVALID_REQUEST");
  const body = input as Record<string, unknown>;
  if (body.action === "list") {
    if (body.query !== undefined && (typeof body.query !== "string" || body.query.trim().length > MAX_QUERY_LENGTH)) throw new Error("COMMERCE_INVALID_QUERY");
    return { action: "list", ...(typeof body.query === "string" && body.query.trim() ? { query: body.query.trim() } : {}) };
  }
  if (body.action === "publish") {
    if (body.approval !== true) throw new Error("COMMERCE_APPROVAL_REQUIRED");
    return { action: "publish", approval: true, product: validateCommerceProduct(body.product) };
  }
  throw new Error("COMMERCE_INVALID_ACTION");
}

export function validateCommerceProduct(input: unknown): CommerceProduct {
  if (!input || typeof input !== "object") throw new Error("COMMERCE_INVALID_PRODUCT");
  const product = input as Record<string, unknown>;
  if (typeof product.id !== "string" || !product.id.trim()) throw new Error("COMMERCE_INVALID_PRODUCT_ID");
  if (typeof product.title !== "string" || !product.title.trim() || product.title.trim().length > MAX_TITLE_LENGTH) throw new Error("COMMERCE_INVALID_PRODUCT_TITLE");
  if (product.price !== undefined && (typeof product.price !== "number" || !Number.isFinite(product.price) || product.price < 0 || product.price > MAX_PRICE)) throw new Error("COMMERCE_INVALID_PRICE");
  if (product.currency !== undefined && (typeof product.currency !== "string" || !CURRENCIES.has(product.currency.toUpperCase()))) throw new Error("COMMERCE_INVALID_CURRENCY");
  if (product.url !== undefined && (typeof product.url !== "string" || !/^https:\/\//i.test(product.url))) throw new Error("COMMERCE_INVALID_URL");
  return { id: product.id.trim(), title: product.title.trim(), ...(typeof product.price === "number" ? { price: product.price } : {}), ...(typeof product.currency === "string" ? { currency: product.currency.toUpperCase() } : {}), ...(typeof product.url === "string" ? { url: product.url.trim() } : {}) };
}

export function validateCommerceProducts(input: unknown): readonly CommerceProduct[] {
  if (!Array.isArray(input)) throw new Error("COMMERCE_INVALID_RESPONSE");
  return input.map(validateCommerceProduct);
}

export function validatePublishResult(input: unknown): { id: string; published: boolean } {
  if (!input || typeof input !== "object") throw new Error("COMMERCE_INVALID_RESPONSE");
  const result = input as Record<string, unknown>;
  if (typeof result.id !== "string" || !result.id.trim() || typeof result.published !== "boolean") throw new Error("COMMERCE_INVALID_RESPONSE");
  return { id: result.id.trim(), published: result.published };
}
