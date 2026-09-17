import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { forgetMemory } from "../forget";

describe("D3 clear-all integration", () => {
  it("routes an explicit clear-all request through the existing memory forget entrypoint", async () => {
    const calls: string[] = [];
    const supabase = {
      from() {
        return {
          select() {
            return {
              eq(column: string, value: string) {
                calls.push(`select.eq:${column}=${value}`);
                return Promise.resolve({ data: [{ id: "memory-1" }, { id: "memory-2" }], error: null });
              },
            };
          },
          delete() {
            return {
              eq(column: string, value: string) {
                calls.push(`delete.eq:${column}=${value}`);
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      },
    };

    const result = await forgetMemory(supabase as never, "user-a", "Vergiss alle meine Erinnerungen.");

    assert.deepEqual(result, {
      ok: true,
      deleted: true,
      memoryId: null,
      target: "all",
      deletedCount: 2,
    });
    assert.ok(calls.includes("select.eq:user_id=user-a"));
    assert.ok(calls.includes("delete.eq:user_id=user-a"));
  });
});
