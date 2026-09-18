import assert from "node:assert/strict";
import test from "node:test";
import { extractExplicitMemory, memoryFingerprint } from "../lib/luna/memory";
import { updateMemory } from "../lib/luna/memory/update";
import { forgetMemory } from "../lib/luna/memory/forget";
import { clearAllMemories } from "../lib/luna/memory/clear-all";
import { executeLunaCommand, parseLunaCommand } from "../lib/luna/command-capabilities";

type Row = {
  id: string;
  user_id: string;
  type: string;
  content: string;
  importance: number;
  metadata: Record<string, unknown>;
  updated_at: string;
};

function createMemoryStore(initial: Row[] = []) {
  const rows = [...initial];
  let sequence = rows.length + 1;

  function matches(row: Row, filters: Array<[string, string, string?]>) {
    return filters.every(([operator, column, value]) => {
      const actual = String(row[column as keyof Row] ?? "");
      if (operator === "eq") return actual === value;
      if (operator === "ilike") {
        const pattern = String(value).replace(/^%|%$/g, "").replace(/\\([%_])/g, "$1").toLocaleLowerCase("de-DE");
        return actual.toLocaleLowerCase("de-DE").includes(pattern);
      }
      return true;
    });
  }

  function query(table: string) {
    if (table !== "memories") return { select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }) }) };
    let filters: Array<[string, string, string?]> = [];
    let selected = false;
    let operation: "select" | "delete" | "update" | "insert" = "select";
    let updatePayload: Partial<Row> = {};
    let insertPayload: Partial<Row> | null = null;
    let limitValue: number | null = null;

    const chain: any = {
      select() {
        selected = true;
        if (!insertPayload) operation = "select";
        return chain;
      },
      eq(column: string, value: string) {
        filters.push(["eq", column, value]);
        return chain;
      },
      ilike(column: string, value: string) {
        filters.push(["ilike", column, value]);
        return chain;
      },
      order() {
        return chain;
      },
      limit(value: number) {
        limitValue = value;
        return chain;
      },
      update(payload: Partial<Row>) {
        operation = "update";
        updatePayload = payload;
        return chain;
      },
      insert(payload: Partial<Row>) {
        operation = "insert";
        insertPayload = payload;
        return chain;
      },
      delete() {
        operation = "delete";
        return chain;
      },
      maybeSingle: async () => {
        const found = rows.filter((row) => matches(row, filters))[0] ?? null;
        return { data: found, error: null };
      },
      single: async () => {
        if (operation === "insert" && insertPayload) {
          const row: Row = {
            id: `memory-${sequence++}`,
            user_id: String(insertPayload.user_id),
            type: String(insertPayload.type ?? "instruction"),
            content: String(insertPayload.content ?? ""),
            importance: Number(insertPayload.importance ?? 0.5),
            metadata: (insertPayload.metadata as Record<string, unknown>) ?? {},
            updated_at: String(insertPayload.updated_at ?? new Date().toISOString()),
          };
          rows.push(row);
          return { data: { id: row.id, type: row.type, content: row.content }, error: null };
        }
        const found = rows.filter((row) => matches(row, filters))[0];
        if (!found) return { data: null, error: new Error("expected row") };
        if (operation === "update") {
          Object.assign(found, updatePayload);
          return { data: { id: found.id, content: found.content }, error: null };
        }
        return { data: found, error: null };
      },
      then(resolve: (value: unknown) => unknown) {
        if (operation === "delete") {
          const before = rows.length;
          for (let index = rows.length - 1; index >= 0; index -= 1) {
            if (matches(rows[index], filters)) rows.splice(index, 1);
          }
          return Promise.resolve(resolve({ data: null, error: null, deleted: before - rows.length }));
        }

        let data = rows.filter((row) => matches(row, filters));
        if (limitValue !== null) data = data.slice(0, limitValue);
        if (selected) return Promise.resolve(resolve({ data, error: null }));
        return Promise.resolve(resolve({ data, error: null }));
      },
    };
    return chain;
  }

  return {
    rows,
    from: (table: string) => query(table),
  };
}

test("memory full lifecycle: remember -> context -> update -> context -> forget -> context -> clear all -> context", async () => {
  const userId = "user-lifecycle";
  const otherUserId = "other-user";
  const store = createMemoryStore([
    {
      id: "other-1",
      user_id: otherUserId,
      type: "fact",
      content: "Fremde Erinnerung bleibt geschützt",
      importance: 0.5,
      metadata: {},
      updated_at: "2026-09-18T08:00:00Z",
    },
  ]);

  const memoryText = extractExplicitMemory("Luna, merke dir: Mein Reiseprojekt heißt LUNA");
  assert.equal(memoryText, "Mein Reiseprojekt heißt LUNA");
  assert.equal(memoryFingerprint("instruction", memoryText!), "instruction:mein reiseprojekt heißt luna");

  store.rows.push({
    id: "memory-1",
    user_id: userId,
    type: "instruction",
    content: memoryText!,
    importance: 1,
    metadata: { source: "explicit_user_instruction" },
    updated_at: "2026-09-18T08:01:00Z",
  });

  const context1 = await executeLunaCommand({ kind: "context" }, store, userId);
  assert.equal(context1.ok, true);
  assert.match(context1.reply, /Gespeicherte Erinnerungen: 1/);
  assert.match(context1.reply, /Mein Reiseprojekt heißt LUNA/);

  assert.deepEqual(parseLunaCommand("Ändere Mein Reiseprojekt heißt LUNA zu Mein Reiseprojekt heißt MASURA"), {
    kind: "update",
    query: "Mein Reiseprojekt heißt LUNA",
    replacement: "Mein Reiseprojekt heißt MASURA",
  });

  const updated = await updateMemory(store as any, userId, "Ändere Mein Reiseprojekt heißt LUNA zu Mein Reiseprojekt heißt MASURA");
  assert.equal(updated.ok, true);
  assert.equal((updated as { content: string }).content, "Mein Reiseprojekt heißt MASURA");

  const context2 = await executeLunaCommand({ kind: "context" }, store, userId);
  assert.match(context2.reply, /Mein Reiseprojekt heißt MASURA/);
  assert.doesNotMatch(context2.reply, /Mein Reiseprojekt heißt LUNA/);

  const forgotten = await forgetMemory(store as any, userId, "Vergiss Mein Reiseprojekt heißt MASURA");
  assert.equal(forgotten.ok, true);
  assert.equal((forgotten as { deleted: boolean }).deleted, true);

  const context3 = await executeLunaCommand({ kind: "context" }, store, userId);
  assert.match(context3.reply, /Gespeicherte Erinnerungen: 0/);
  assert.doesNotMatch(context3.reply, /Mein Reiseprojekt heißt MASURA/);

  store.rows.push(
    {
      id: "memory-2",
      user_id: userId,
      type: "instruction",
      content: "Erste neue Erinnerung",
      importance: 1,
      metadata: {},
      updated_at: "2026-09-18T08:02:00Z",
    },
    {
      id: "memory-3",
      user_id: userId,
      type: "preference",
      content: "Zweite neue Erinnerung",
      importance: 0.8,
      metadata: {},
      updated_at: "2026-09-18T08:03:00Z",
    },
  );

  const cleared = await clearAllMemories(store as any, userId);
  assert.deepEqual(cleared, { ok: true, deletedCount: 2 });

  const context4 = await executeLunaCommand({ kind: "context" }, store, userId);
  assert.match(context4.reply, /Gespeicherte Erinnerungen: 0/);
  assert.doesNotMatch(context4.reply, /Erste neue Erinnerung|Zweite neue Erinnerung/);

  assert.equal(store.rows.length, 1);
  assert.equal(store.rows[0].user_id, otherUserId);
  assert.match(store.rows[0].content, /Fremde Erinnerung bleibt geschützt/);
});
