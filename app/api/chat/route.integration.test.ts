import assert from "node:assert/strict";
import test from "node:test";
import { handleChatPost } from "./chat-handler";
import { ExternalTrustedAuthAdapter } from "../../../lib/luna/trusted-auth";

type QueryBuilder = {
  select: () => QueryBuilder;
  insert: () => QueryBuilder;
  update: () => QueryBuilder;
  eq: () => QueryBuilder;
  order: () => QueryBuilder;
  limit: () => QueryBuilder;
  single: () => QueryBuilder;
  maybeSingle: () => QueryBuilder;
  then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>;
};

function createQueryResult(table: string, operation: string) {
  if (table === "conversations" && operation === "insert") return { data: { id: "conversation-1" }, error: null };
  if (table === "messages" && operation === "select") return { data: [], error: null };
  if (table === "memories" && operation === "select") return { data: [], error: null };
  return { data: null, error: null };
}

function createFakeSupabase() {
  return {
    from(table: string) {
      let operation = "unknown";
      const builder: QueryBuilder = {
        select() { operation = "select"; return builder; },
        insert() { operation = "insert"; return builder; },
        update() { operation = "update"; return builder; },
        eq() { return builder; },
        order() { return builder; },
        limit() { return builder; },
        single() { operation = "insert"; return builder; },
        maybeSingle() { return builder; },
        then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
          return Promise.resolve(createQueryResult(table, operation)).then(resolve, reject);
        },
      };
      return builder;
    },
  };
}

const identity = new ExternalTrustedAuthAdapter("cp72-test").verifyIdentity({
  subject: "cp72-user",
  role: "user",
  issuer: "cp72-test",
  issuedAt: 1_000,
  expiresAt: 2_000,
  nonce: "cp72-chat",
  scopes: ["search:read"],
}, 1_500)!;

test("CP72 chat integration executes research through Core, Guardian, registry handler, and provider", async () => {
  let searchCalls = 0;
  let openAiCalls = 0;
  const supabase = createFakeSupabase();

  const response = await handleChatPost(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Recherchiere aktuelle Informationen" }),
    }),
    {
      requireUser: async () => ({
        supabase: supabase as never,
        user: { id: "cp72-user" },
        role: "user" as const,
        identity,
      }),
      search: async (query) => {
        searchCalls += 1;
        assert.equal(query, "Recherchiere aktuelle Informationen");
        return [{ title: "Verified result", url: "https://example.com/result", snippet: "verified" }];
      },
      openAI: {
        responses: {
          create: async () => {
            openAiCalls += 1;
            return { output_text: "Verified reply" };
          },
        },
      } as never,
    },
  );

  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.decision, "USE_TOOL");
  assert.equal(body.agent, "luna");
  assert.equal(body.actionAgent, "research");
  assert.equal(body.actionStatus, "completed");
  assert.equal(body.searchPerformed, true);
  assert.equal(body.sources[0].url, "https://example.com/result");
  assert.equal(body.reply, "Verified reply");
  assert.equal(searchCalls, 1);
  assert.equal(openAiCalls, 1);
});
