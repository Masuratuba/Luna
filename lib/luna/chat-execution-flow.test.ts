import assert from "node:assert/strict";
import test from "node:test";
import type { SearchProvider, SearchRequest, SearchResult } from "../providers/contracts";
import { createAction, runLunaCore, type LunaAction } from "./core";
import { createDefaultToolHandlerRegistry } from "./default-tool-handlers";
import { ExecutionBudget } from "./execution-budget";
import { executeThroughGuardian } from "./guardian-gateway";
import { persistAction, type ActionPersistenceClient } from "./action-persistence";
import { ExternalTrustedAuthAdapter } from "./trusted-auth";

type Write = { table: string; operation: string; values?: Record<string, unknown>; filters?: Array<[string, string]> };

function fakePersistence() {
  const writes: Write[] = [];
  const client: ActionPersistenceClient = {
    from(table: string) {
      return {
        update(values: Record<string, unknown>) {
          const write: Write = { table, operation: "update", values, filters: [] };
          writes.push(write);
          const builder = {
            eq(column: string, value: string) {
              write.filters?.push([column, value]);
              return builder;
            },
            then(resolve: (value: { error: Error | null }) => unknown, reject?: (reason: unknown) => unknown) {
              return Promise.resolve({ error: null }).then(resolve, reject);
            },
          };
          return builder;
        },
        insert(values: Record<string, unknown>) {
          writes.push({ table, operation: "insert", values });
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  return { client, writes };
}

const identity = new ExternalTrustedAuthAdapter("cp72-integration").verifyIdentity({
  subject: "user-1",
  role: "user",
  issuer: "cp72-integration",
  issuedAt: 1_000,
  expiresAt: 2_000,
  nonce: "cp72-full-path",
  scopes: ["search:read"],
}, 1_500)!;

async function runSearch(provider: SearchProvider) {
  const message = "Recherchiere aktuelle Informationen zu LUNA";
  const core = runLunaCore({ userId: "user-1", message, conversationId: "conversation-1" });
  assert.equal(core.decision, "USE_TOOL");
  assert.equal(core.agent, "research");
  assert.equal(core.dispatch.approved, true);

  const action: LunaAction = createAction("tool", {
    message,
    query: message,
    conversationId: "conversation-1",
    agent: core.agent,
    tool: "search",
  });
  const persistence = fakePersistence();
  persistence.writes.push({ table: "luna_actions", operation: "insert", values: { id: action.id, user_id: "user-1", status: "pending" } });

  const result = await executeThroughGuardian({
    agent: core.agent,
    capability: "search",
    mode: "read",
    action,
    context: {
      authenticated: true,
      userId: "user-1",
      role: "user",
      identity,
      budget: new ExecutionBudget(),
    },
    toolRegistry: createDefaultToolHandlerRegistry(provider),
  });

  assert.equal(result.access.allowed, true);
  assert.equal(result.guard.allowed, true);
  assert.ok(result.execution);
  await persistAction(persistence.client, "user-1", action, result.execution, result.guard.risk);
  return { core, action, result, writes: persistence.writes };
}

test("CP72 integration: chat research intent reaches provider through Core and Guardian and persists success", async () => {
  const received: SearchRequest[] = [];
  const expected: SearchResult[] = [{ title: "LUNA", url: "https://example.com/luna" }];
  const provider: SearchProvider = {
    name: "integration-search",
    async search(request) {
      received.push(request);
      return expected;
    },
  };

  const { action, result, writes } = await runSearch(provider);

  assert.equal(received.length, 1);
  assert.equal(received[0].query, "Recherchiere aktuelle Informationen zu LUNA");
  assert.equal(result.ok, true);
  assert.equal(result.execution?.action.status, "completed");
  assert.deepEqual(result.execution?.output, { query: received[0].query, results: expected });
  assert.equal(writes.find((write) => write.table === "luna_actions" && write.operation === "update")?.values?.status, "completed");
  assert.equal(writes.find((write) => write.table === "luna_events")?.values?.event_type, "action.completed");
  assert.equal(writes.find((write) => write.table === "luna_audit_log")?.values?.outcome, "success");
  assert.ok(writes.find((write) => write.table === "luna_actions" && write.operation === "update")?.filters?.some(([column, value]) => column === "user_id" && value === "user-1"));
});

test("CP72 integration: provider failure is blocked from success claims and persists failure", async () => {
  let providerCalled = false;
  const provider: SearchProvider = {
    name: "failing-integration-search",
    async search() {
      providerCalled = true;
      throw new Error("provider unavailable");
    },
  };

  const { result, writes } = await runSearch(provider);

  assert.equal(providerCalled, true);
  assert.equal(result.ok, false);
  assert.equal(result.execution?.action.status, "failed");
  assert.match(result.execution?.error ?? "", /provider unavailable/);
  assert.equal(writes.find((write) => write.table === "luna_actions" && write.operation === "update")?.values?.status, "failed");
  assert.equal(writes.find((write) => write.table === "luna_events")?.values?.event_type, "action.failed");
  assert.equal(writes.find((write) => write.table === "luna_audit_log")?.values?.outcome, "failure");
});
