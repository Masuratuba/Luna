import assert from "node:assert/strict";
import test from "node:test";
import { DisabledFinancialProvider } from "./financial-provider";
import { extractSearchResults, HttpAnalyticsProvider, HttpCommerceProvider, HttpSearchProvider } from "./http-providers";
import { createProviderRegistry } from "./registry";

test("provider registry exposes all five boundaries", () => {
  const registry = createProviderRegistry();
  assert.equal(typeof registry.openai, "function");
  assert.equal(typeof registry.search, "function");
  assert.equal(typeof registry.analytics, "function");
  assert.equal(typeof registry.commerce, "function");
  assert.equal(typeof registry.financial, "function");
});

test("search adapter fails closed when query is absent", async () => {
  await assert.rejects(() => new HttpSearchProvider().search({ query: "" }), /SEARCH_QUERY_REQUIRED/);
});

test("search citation extractor returns unique sources and respects limit", () => {
  const result = extractSearchResults({
    output_text: "Answer from the web.",
    output: [{
      type: "message",
      content: [{
        type: "output_text",
        annotations: [
          { type: "url_citation", url_citation: { title: "Source A", url: "https://a.example" } },
          { type: "url_citation", url_citation: { title: "Source A duplicate", url: "https://a.example" } },
          { type: "url_citation", url_citation: { title: "Source B", url: "https://b.example" } },
        ],
      }],
    }],
  }, 2);

  assert.deepEqual(result, [
    { title: "Source A", url: "https://a.example", snippet: "Answer from the web." },
    { title: "Source B", url: "https://b.example", snippet: "Answer from the web." },
  ]);
});

test("search citation extractor falls back to answer text without citations", () => {
  assert.deepEqual(extractSearchResults({ output_text: "No citations returned.", output: [] }, 5), [
    { title: "Luna Search", url: "", snippet: "No citations returned." },
  ]);
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

test("analytics adapter sends JSON and auth to configured provider", async () => {
  const originalFetch = globalThis.fetch;
  let captured: { url: string; body: string; authorization?: string } | undefined;
  globalThis.fetch = async (input, init) => {
    captured = {
      url: String(input),
      body: String(init?.body),
      authorization: new Headers(init?.headers).get("authorization") ?? undefined,
    };
    return new Response(JSON.stringify({ value: 42, unit: "events", source: "test-provider" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const result = await new HttpAnalyticsProvider("https://analytics.test", "secret").measure({ metric: "events" });
    assert.deepEqual(result, { value: 42, unit: "events", source: "test-provider" });
    assert.equal(captured?.url, "https://analytics.test");
    assert.equal(captured?.authorization, "Bearer secret");
    assert.equal(captured?.body, JSON.stringify({ metric: "events" }));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("commerce adapter rejects non-JSON provider responses", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("not-json", { status: 200, headers: { "content-type": "text/plain" } });
  try {
    await assert.rejects(() => new HttpCommerceProvider("https://commerce.test").listProducts(), /PROVIDER_INVALID_CONTENT_TYPE/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("provider HTTP adapter fails closed on timeout errors", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new DOMException("timed out", "TimeoutError");
  };
  try {
    await assert.rejects(() => new HttpAnalyticsProvider("https://slow.test").measure({ metric: "test" }), /PROVIDER_REQUEST_TIMEOUT/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
