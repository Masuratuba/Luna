import assert from "node:assert/strict";
import test from "node:test";
import { createTaskCollectionHandlers, createTaskItemHandlers } from "./task-handlers";

type Result = { data?: unknown; error?: unknown };
function mockSupabase(result: Result = { data: [] }) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const builder: any = {};
  for (const method of ["from", "select", "eq", "order", "insert", "update", "delete"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }
  builder.single = async () => {
    calls.push({ method: "single", args: [] });
    return result;
  };
  builder.then = (resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return { supabase: builder, calls };
}
function auth(supabase: any, userId = "user-123") {
  return async (_request: Request) => ({ supabase, user: { id: userId } });
}
function request(method: string, body?: unknown) {
  return new Request("http://localhost/api/tasks", {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function json(response: Response) { return response.json(); }

test("GET scopes the query to the authenticated user and returns tasks", async () => {
  const rows = [{ id: "t1", user_id: "user-123", title: "Only mine" }];
  const mock = mockSupabase({ data: rows });
  const handlers = createTaskCollectionHandlers(auth(mock.supabase));
  const response = await handlers.GET(request("GET"));
  assert.equal(response.status, 200);
  assert.deepEqual((await json(response)).tasks, rows);
  assert.ok(mock.calls.some(c => c.method === "eq" && c.args[0] === "user_id" && c.args[1] === "user-123"));
  assert.ok(mock.calls.some(c => c.method === "order" && c.args[0] === "due_at"));
});

test("GET returns 401 when authentication fails and 500 on database failure", async () => {
  const unauthorized = createTaskCollectionHandlers(async () => { throw new Error("UNAUTHORIZED"); });
  assert.equal((await unauthorized.GET(request("GET"))).status, 401);
  const broken = createTaskCollectionHandlers(auth(mockSupabase({ error: new Error("db down") }).supabase));
  assert.equal((await broken.GET(request("GET"))).status, 500);
});

test("POST creates an owned task with defaults and trims title", async () => {
  const created = { id: "t2", user_id: "user-123", title: "Buy food", status: "todo", priority: 3 };
  const mock = mockSupabase({ data: created });
  const handlers = createTaskCollectionHandlers(auth(mock.supabase));
  const response = await handlers.POST(request("POST", { title: "  Buy food  " }));
  assert.equal(response.status, 201);
  assert.deepEqual((await json(response)).task, created);
  const insert = mock.calls.find(c => c.method === "insert")?.args[0] as Record<string, unknown>;
  assert.equal(insert.user_id, "user-123");
  assert.equal(insert.title, "Buy food");
  assert.equal(insert.status, "todo");
  assert.equal(insert.priority, 3);
  assert.equal(insert.project_id, null);
});

test("POST rejects malformed fields before touching the database and handles database errors", async () => {
  const mock = mockSupabase({ data: null });
  const handlers = createTaskCollectionHandlers(auth(mock.supabase));
  assert.equal((await handlers.POST(request("POST", { title: "  " }))).status, 400);
  assert.equal((await handlers.POST(request("POST", { title: "Bad", priority: 99 }))).status, 400);
  assert.equal(mock.calls.some(c => c.method === "insert"), false);
  const broken = createTaskCollectionHandlers(auth(mockSupabase({ error: new Error("db down") }).supabase));
  assert.equal((await broken.POST(request("POST", { title: "Valid" }))).status, 500);
});

test("PATCH scopes updates by both task id and user id, and ignores unapproved fields", async () => {
  const updated = { id: "t3", title: "Updated" };
  const mock = mockSupabase({ data: updated });
  const handlers = createTaskItemHandlers(auth(mock.supabase));
  const response = await handlers.PATCH(request("PATCH", { title: " Updated ", user_id: "attacker", is_admin: true }), { params: Promise.resolve({ id: "t3" }) });
  assert.equal(response.status, 200);
  const update = mock.calls.find(c => c.method === "update")?.args[0] as Record<string, unknown>;
  assert.equal(update.title, "Updated");
  assert.equal("user_id" in update, false);
  assert.equal("is_admin" in update, false);
  assert.ok(mock.calls.some(c => c.method === "eq" && c.args[0] === "id" && c.args[1] === "t3"));
  assert.ok(mock.calls.some(c => c.method === "eq" && c.args[0] === "user_id" && c.args[1] === "user-123"));
});

test("PATCH rejects empty or invalid changes and maps missing rows to 404", async () => {
  const mock = mockSupabase({ data: null, error: new Error("not found") });
  const handlers = createTaskItemHandlers(auth(mock.supabase));
  assert.equal((await handlers.PATCH(request("PATCH", {}), { params: Promise.resolve({ id: "missing" }) })).status, 400);
  assert.equal((await handlers.PATCH(request("PATCH", { status: "alien" }), { params: Promise.resolve({ id: "missing" }) })).status, 400);
  assert.equal((await handlers.PATCH(request("PATCH", { title: "Valid" }), { params: Promise.resolve({ id: "missing" }) })).status, 404);
});

test("DELETE scopes deletion to the authenticated owner and reports failures", async () => {
  const mock = mockSupabase({ data: null });
  const handlers = createTaskItemHandlers(auth(mock.supabase));
  const response = await handlers.DELETE(request("DELETE"), { params: Promise.resolve({ id: "t4" }) });
  assert.equal(response.status, 200);
  assert.ok(mock.calls.some(c => c.method === "eq" && c.args[0] === "id" && c.args[1] === "t4"));
  assert.ok(mock.calls.some(c => c.method === "eq" && c.args[0] === "user_id" && c.args[1] === "user-123"));
  const unauthorized = createTaskItemHandlers(async () => { throw new Error("UNAUTHORIZED"); });
  assert.equal((await unauthorized.DELETE(request("DELETE"), { params: Promise.resolve({ id: "t4" }) })).status, 401);
  const broken = createTaskItemHandlers(auth(mockSupabase({ error: new Error("db down") }).supabase));
  assert.equal((await broken.DELETE(request("DELETE"), { params: Promise.resolve({ id: "t4" }) })).status, 500);
});
