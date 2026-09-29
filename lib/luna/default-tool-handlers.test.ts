import assert from "node:assert/strict";
import test from "node:test";
import type { SearchRequest, SearchResult, SearchProvider } from "../providers/contracts";
import { createAction } from "./core";
import { createDefaultToolHandlerRegistry } from "./default-tool-handlers";

test("CP72: registered default search handler forwards the query and returns provider results", async () => {
  const expectedResults: readonly SearchResult[] = [
    { title: "LUNA docs", url: "https://example.com/luna", snippet: "Controlled provider result" },
  ];
  let received: SearchRequest | undefined;
  const provider: SearchProvider = {
    name: "controlled-test-search",
    async search(request) {
      received = request;
      return expectedResults;
    },
  };
  const registry = createDefaultToolHandlerRegistry(provider);
  const action = {
    ...createAction("tool", { tool: "search", query: "  LUNA guardian  ", limit: 3 }),
    status: "approved" as const,
  };

  const result = await registry.execute(action);

  assert.deepEqual(received, { query: "LUNA guardian", limit: 3 });
  assert.deepEqual(result, { query: "LUNA guardian", results: expectedResults });
});

test("CP72: default search handler rejects an empty query without calling the provider", async () => {
  let providerCalled = false;
  const provider: SearchProvider = {
    name: "controlled-test-search",
    async search() {
      providerCalled = true;
      return [];
    },
  };
  const registry = createDefaultToolHandlerRegistry(provider);
  const action = {
    ...createAction("tool", { tool: "search", query: "   " }),
    status: "approved" as const,
  };

  await assert.rejects(registry.execute(action), /SEARCH_QUERY_REQUIRED/);
  assert.equal(providerCalled, false);
});

test("CP72: provider errors propagate from the registered search handler", async () => {
  const provider: SearchProvider = {
    name: "failing-test-search",
    async search() {
      throw new Error("provider unavailable");
    },
  };
  const registry = createDefaultToolHandlerRegistry(provider);
  const action = {
    ...createAction("tool", { tool: "search", query: "failure path" }),
    status: "approved" as const,
  };

  await assert.rejects(registry.execute(action), /provider unavailable/);
});
