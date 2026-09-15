import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { updateMemory } from "./index";

describe("memory update", () => {
  test("updates a matching memory", async () => {
    let updated = false;
    const supabase = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  ilike() {
                    return {
                      limit: async () => ({
                        data: [{ id: "memory-1", content: "Lieblingsfarbe ist Blau" }],
                        error: null,
                      }),
                    };
                  },
                };
              },
            };
          },
          update() {
            updated = true;
            return {
              eq() {
                return {
                  eq() {
                    return { select: async () => ({ data: [{ id: "memory-1" }], error: null }) };
                  },
                };
              },
            };
          },
        };
      },
    };
    const result = await updateMemory(supabase as never, "user-a", "Ändere Lieblingsfarbe zu Rot");
    assert.equal(result.ok, true);
    assert.equal(updated, true);
  });

  test("parses malformed update command", async () => {
    const result = await updateMemory({} as never, "user-a", "Ändere");
    assert.deepEqual(result, { ok: false, reason: "NO_TARGET" });
  });

  test("rejects sensitive replacement", async () => {
    const result = await updateMemory({} as never, "user-a", "Ändere Lieblingsfarbe zu password=secret123");
    assert.deepEqual(result, { ok: false, reason: "SENSITIVE" });
  });

  test("does not update another user's memory", async () => {
    let updated = false;
    const supabase = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  ilike() {
                    return {
                      limit: async () => ({ data: [], error: null }),
                    };
                  },
                };
              },
            };
          },
          update() {
            updated = true;
            throw new Error("update must not be called");
          },
        };
      },
    };
    const result = await updateMemory(supabase as never, "user-a", "Ändere Lieblingsfarbe zu Rot");
    assert.deepEqual(result, { ok: false, reason: "NOT_FOUND" });
    assert.equal(updated, false);
  });

  test("does not update when multiple memories match the target", async () => {
    let updated = false;
    const supabase = {
      from() {
        return {
          select() {
            const query = {
              eq() {
                return query;
              },
              ilike() {
                return query;
              },
              limit: async () => ({
                data: [
                  { id: "memory-1", content: "Lieblingsfarbe ist Blau" },
                  { id: "memory-2", content: "Lieblingsfarbe ist Grün" },
                ],
                error: null,
              }),
            };
            return query;
          },
          update() {
            updated = true;
            throw new Error("update must not be called");
          },
        };
      },
    };
    assert.deepEqual(await updateMemory(supabase as never, "user-a", "Ändere Lieblingsfarbe zu Rot"), {
      ok: false,
      reason: "AMBIGUOUS",
    });
    assert.equal(updated, false);
  });
});
