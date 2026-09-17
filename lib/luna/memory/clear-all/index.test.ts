import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clearAllMemories, isClearAllMemoriesRequest } from "./index";

describe("isolated D3 clear-all memories", () => {
  it("recognizes explicit clear-all memory requests", () => {
    assert.equal(isClearAllMemoriesRequest("Vergiss alle meine Erinnerungen."), true);
    assert.equal(isClearAllMemoriesRequest("Lösche alle Memories"), true);
    assert.equal(isClearAllMemoriesRequest("Vergiss alles, was du dir über mich gemerkt hast"), true);
    assert.equal(isClearAllMemoriesRequest("Vergiss meine alte Präferenz"), false);
  });

  it("deletes all memories only for the supplied user", async () => {
    const calls: string[] = [];
    const supabase = {
      from(table: string) {
        assert.equal(table, "memories");
        return {
          select() {
            calls.push("select");
            return {
              eq(column: string, value: string) {
                calls.push(`select.eq:${column}=${value}`);
                return Promise.resolve({ data: [{ id: "memory-1" }, { id: "memory-2" }], error: null });
              },
            };
          },
          delete() {
            calls.push("delete");
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

    const result = await clearAllMemories(supabase as never, "user-a");

    assert.deepEqual(result, { ok: true, deletedCount: 2 });
    assert.ok(calls.includes("select.eq:user_id=user-a"));
    assert.ok(calls.includes("delete.eq:user_id=user-a"));
  });

  it("does not issue a delete when the user has no memories", async () => {
    let deleted = false;
    const supabase = {
      from() {
        return {
          select() {
            return {
              eq() {
                return Promise.resolve({ data: [], error: null });
              },
            };
          },
          delete() {
            deleted = true;
            throw new Error("delete must not be called");
          },
        };
      },
    };

    const result = await clearAllMemories(supabase as never, "user-a");
    assert.deepEqual(result, { ok: true, deletedCount: 0 });
    assert.equal(deleted, false);
  });
});
