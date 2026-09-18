import assert from "node:assert/strict";
import test from "node:test";
import { createSchedulerDeliveryHandler } from "../lib/luna/scheduler-delivery-handler";

function action(input: Record<string, unknown>) {
  return { id: "scheduled:test", type: "task" as const, status: "approved" as const, input };
}

test("scheduler delivery records a reminder", async () => {
  let inserted: Record<string, unknown> | null = null;
  const supabase = {
    from(table: string) {
      assert.equal(table, "scheduler_deliveries");
      return {
        select() { return this; },
        eq() { return this; },
        async maybeSingle() { return { data: null, error: null }; },
        insert(row: Record<string, unknown>) {
          inserted = row;
          return {
            select() { return this; },
            async single() { return { data: { id: "delivery-1", ...row }, error: null }; },
          };
        },
      };
    },
  };

  const result = await createSchedulerDeliveryHandler(supabase as any)(
    action({ scheduledTaskId: "task-1", userId: "user-1", title: "Test reminder", kind: "reminder" }),
  );

  assert.equal(result.idempotent, false);
  assert.equal((inserted as any).task_id, "task-1");
  assert.equal((inserted as any).user_id, "user-1");
  assert.equal((inserted as any).body, "LUNA-Erinnerung: Test reminder");
});

test("scheduler delivery is idempotent by task and user", async () => {
  let insertCalled = false;
  const existing = { id: "delivery-1", task_id: "task-1", user_id: "user-1", status: "recorded", recorded_at: "now" };
  const supabase = {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        async maybeSingle() { return { data: existing, error: null }; },
        insert() {
          insertCalled = true;
          throw new Error("insert must not be called");
        },
      };
    },
  };

  const result = await createSchedulerDeliveryHandler(supabase as any)(
    action({ scheduledTaskId: "task-1", userId: "user-1", title: "Again", kind: "reminder" }),
  );

  assert.equal(result.idempotent, true);
  assert.equal(insertCalled, false);
});
