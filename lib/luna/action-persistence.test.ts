import assert from "node:assert/strict";
import test from "node:test";
import { persistAction, type ActionPersistenceClient } from "./action-persistence";
import type { LunaAction } from "./core";

type Recorded = { table: string; operation: string; values?: Record<string, unknown>; column?: string; value?: string };

function createFakeSupabase(failTable?: string) {
  const calls: Recorded[] = [];
  const client: ActionPersistenceClient = {
    from(table) {
      return {
        update(values: Record<string, unknown>) {
          calls.push({ table, operation: "update", values });
          return {
            eq(column: string, value: string) {
              calls.push({ table, operation: "eq", column, value });
              return Promise.resolve({ error: failTable === table ? new Error(`${table} failed`) : null });
            },
          };
        },
        insert(values: Record<string, unknown>) {
          calls.push({ table, operation: "insert", values });
          return Promise.resolve({ error: failTable === table ? new Error(`${table} failed`) : null });
        },
      };
    },
  };
  return { client, calls };
}

const action: LunaAction = {
  id: "action-1",
  type: "tool",
  status: "pending",
  input: { query: "test" },
};

test("persistAction records successful completion and success audit", async () => {
  const { client, calls } = createFakeSupabase();

  await persistAction(client, "user-1", action, { ok: true, output: { results: [] } }, "low");

  const actionUpdate = calls.find((call) => call.table === "luna_actions" && call.operation === "update");
  assert.deepEqual(actionUpdate?.values?.status, "completed");
  assert.deepEqual(actionUpdate?.values?.output, { results: [] });
  assert.equal(calls.some((call) => call.table === "luna_actions" && call.column === "id" && call.value === "action-1"), true);
  assert.equal(calls.some((call) => call.table === "luna_actions" && call.column === "user_id" && call.value === "user-1"), false);

  const eventInsert = calls.find((call) => call.table === "luna_events");
  assert.equal(eventInsert?.values?.event_type, "action.completed");
  assert.deepEqual(eventInsert?.values?.data, {
    actionId: "action-1",
    type: "tool",
    status: "completed",
    error: null,
  });

  const auditInsert = calls.find((call) => call.table === "luna_audit_log");
  assert.equal(auditInsert?.values?.outcome, "success");
  assert.equal(auditInsert?.values?.risk, "low");
});

test("persistAction records failed execution and preserves the error", async () => {
  const { client, calls } = createFakeSupabase();

  await persistAction(client, "user-1", action, { ok: false, error: "provider unavailable" }, "medium");

  const actionUpdate = calls.find((call) => call.table === "luna_actions" && call.operation === "update");
  assert.equal(actionUpdate?.values?.status, "failed");
  assert.deepEqual(actionUpdate?.values?.output, { error: "provider unavailable" });

  const eventInsert = calls.find((call) => call.table === "luna_events");
  assert.equal(eventInsert?.values?.event_type, "action.failed");

  const auditInsert = calls.find((call) => call.table === "luna_audit_log");
  assert.equal(auditInsert?.values?.outcome, "failure");
  assert.equal(auditInsert?.values?.risk, "medium");
});

test("persistAction fails closed when action persistence fails", async () => {
  const { client } = createFakeSupabase("luna_actions");

  await assert.rejects(
    persistAction(client, "user-1", action, { ok: true, output: { results: [] } }, "low"),
    /luna_actions failed/,
  );
});
