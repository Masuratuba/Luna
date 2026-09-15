import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractForgetTarget, forgetMemory, isForgetMemoryRequest } from "./index";

describe("isolated D1 memory forget", () => {
  it("extracts the exact target from natural German requests", () => {
    assert.equal(extractForgetTarget("Vergiss meine alte Präferenz."), "meine alte Präferenz");
    assert.equal(extractForgetTarget("Vergiss, dass ich gerne reise."), "ich gerne reise");
    assert.equal(extractForgetTarget("Bitte lösche, dass ich gerne reise!"), "ich gerne reise");
  });

  it("recognizes forget requests without confusing empty input", () => {
    assert.equal(isForgetMemoryRequest("Vergiss meine Präferenz"), true);
    assert.equal(isForgetMemoryRequest("Vergiss, dass ich reise"), true);
    assert.equal(isForgetMemoryRequest("Merke dir, dass ich reise"), false);
    assert.equal(extractForgetTarget("Vergiss"), null);
  });

  it("deletes only the exact target for the supplied user", async () => {
    const calls: string[] = [];
    const row = { id: "memory-1", content: "meine alte Präferenz" };
    const supabase = {
      from(table: string) {
        assert.equal(table, "memories");
        return {
          select() {
            calls.push("select");
            return {
              eq(column: string, value: string) {
                calls.push(`select.eq:${column}=${value}`);
                return {
                  eq(nextColumn: string, nextValue: string) {
                    calls.push(`select.eq:${nextColumn}=${nextValue}`);
                    return {
                      async maybeSingle() {
                        calls.push("maybeSingle");
                        return { data: row, error: null };
                      },
                    };
                  },
                };
              },
            };
          },
          delete() {
            calls.push("delete");
            return {
              eq(column: string, value: string) {
                calls.push(`delete.eq:${column}=${value}`);
                return {
                  async eq(nextColumn: string, nextValue: string) {
                    calls.push(`delete.eq:${nextColumn}=${nextValue}`);
                    return { error: null };
                  },
                };
              },
            };
          },
        };
      },
    };

    const result = await forgetMemory(supabase as never, "user-a", "Vergiss meine alte Präferenz.");

    assert.deepEqual(result, {
      ok: true,
      deleted: true,
      memoryId: "memory-1",
      target: "meine alte Präferenz",
    });
    assert.ok(calls.includes("select.eq:user_id=user-a"));
    assert.ok(calls.includes("select.eq:content=meine alte Präferenz"));
    assert.ok(calls.includes("delete.eq:user_id=user-a"));
    assert.ok(calls.includes("delete.eq:id=memory-1"));
  });

  it("does not delete when no exact memory exists", async () => {
    let deleted = false;
    const supabase = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return { async maybeSingle() { return { data: null, error: null }; } };
                  },
                };
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

    const result = await forgetMemory(supabase as never, "user-a", "Vergiss nicht vorhanden");
    assert.deepEqual(result, { ok: false, reason: "NOT_FOUND" });
    assert.equal(deleted, false);
  });
});
