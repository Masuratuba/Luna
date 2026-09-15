import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseMemoryUpdate, updateMemory } from "./index";

describe("isolated D2 memory update", () => {
  it("parses natural German update requests", () => {
    assert.deepEqual(parseMemoryUpdate("Ändere meine Lieblingsfarbe zu Blau."), {
      target: "meine Lieblingsfarbe",
      replacement: "Blau",
    });
    assert.deepEqual(parseMemoryUpdate("Luna, aktualisiere meinen Wohnort auf Berlin"), {
      target: "meinen Wohnort",
      replacement: "Berlin",
    });
    assert.deepEqual(parseMemoryUpdate("Bitte ändere, dass ich gerne reise zu dass ich gerne wandere"), {
      target: "dass ich gerne reise",
      replacement: "dass ich gerne wandere",
    });
  });

  it("rejects malformed and sensitive updates", async () => {
    assert.equal(parseMemoryUpdate("Ändere meine Präferenz"), null);
    const supabase = { from() { throw new Error("database must not be called"); } };
    assert.deepEqual(await updateMemory(supabase as never, "user-a", "Ändere meine Präferenz zu password=secret"), {
      ok: false,
      reason: "SENSITIVE",
    });
  });

  it("updates only a memory belonging to the supplied user", async () => {
    const calls: string[] = [];
    const row = { id: "memory-1", content: "meine Lieblingsfarbe" };
    const supabase = {
      from(table: string) {
        assert.equal(table, "memories");
        return {
          select() {
            return {
              eq(column: string, value: string) {
                calls.push(`select.eq:${column}=${value}`);
                return {
                  ilike(column2: string, value2: string) {
                    calls.push(`select.ilike:${column2}=${value2}`);
                    return { limit: async () => ({ data: [row], error: null }) };
                  },
                };
              },
            };
          },
          update(values: Record<string, unknown>) {
            assert.equal(values.content, "Blau");
            return {
              eq(column: string, value: string) {
                calls.push(`update.eq:${column}=${value}`);
                return {
                  eq(column2: string, value2: string) {
                    calls.push(`update.eq:${column2}=${value2}`);
                    return {
                      select() {
                        return {
                          async single() { return { data: { id: "memory-1", content: "Blau" }, error: null }; },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
    };

    const result = await updateMemory(supabase as never, "user-a", "Ändere meine Lieblingsfarbe zu Blau");
    assert.deepEqual(result, {
      ok: true,
      memoryId: "memory-1",
      previousContent: "meine Lieblingsfarbe",
      content: "Blau",
    });
    assert.ok(calls.includes("select.eq:user_id=user-a"));
    assert.ok(calls.includes("update.eq:user_id=user-a"));
    assert.ok(calls.includes("update.eq:id=memory-1"));
  });

  it("does not update when no matching memory exists", async () => {
    let updated = false;
    const supabase = {
      from() {
        return {
          select() {
            return { eq() { return { ilike() { return { limit: async () => ({ data: [], error: null }) }; } }; } };
          },
          update() { updated = true; throw new Error("update must not be called"); },
        };
      },
    };
    assert.deepEqual(await updateMemory(supabase as never, "user-a", "Ändere meine Lieblingsfarbe zu Blau"), {
      ok: false,
      reason: "NOT_FOUND",
    });
    assert.equal(updated, false);
  });
});
