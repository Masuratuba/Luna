import assert from "node:assert/strict";
import test from "node:test";
import { executeLunaCommand, parseLunaCommand } from "../lib/luna/command-capabilities";

test("context command is recognized", () => {
  assert.deepEqual(parseLunaCommand("Luna, Kontext"), { kind: "context" });
  assert.deepEqual(parseLunaCommand("Kontext"), { kind: "context" });
});

test("context command displays saved memories", async () => {
  const calls: Array<{ table: string; column: string; value: string }> = [];
  const data = {
    projects: [{ id: "p1", name: "LUNA", status: "active", description: "AI assistant" }],
    tasks: [{ id: "t1", title: "D4 fertigstellen", status: "in_progress", priority: 1 }],
    memories: [
      { type: "instruction", content: "Technische Aufgaben isoliert bearbeiten", importance: 1, updated_at: "2026-09-18T08:00:00Z" },
      { type: "preference", content: "Antworten direkt und klar", importance: 0.9, updated_at: "2026-09-17T08:00:00Z" },
    ],
  };

  const supabase = {
    from(table: string) {
      return {
        select() {
          const query = {
            eq(column: string, value: string) {
              calls.push({ table, column, value });
              return query;
            },
            order() {
              return query;
            },
            limit: async () => ({ data: data[table as keyof typeof data], error: null }),
          };
          return query;
        },
      };
    },
  };

  const result = await executeLunaCommand({ kind: "context" }, supabase, "user-123");

  assert.equal(result.ok, true);
  assert.match(result.reply, /Gespeicherte Erinnerungen: 2/);
  assert.match(result.reply, /Technische Aufgaben isoliert bearbeiten/);
  assert.match(result.reply, /Antworten direkt und klar/);
  assert.deepEqual((result as { result: { memories: typeof data.memories } }).result.memories, data.memories);
  assert.deepEqual(
    calls.filter((call) => call.table === "memories"),
    [{ table: "memories", column: "user_id", value: "user-123" }],
  );
});
