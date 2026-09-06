import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { containsSensitiveMemory, extractExplicitMemory, memoryFingerprint, normalizeMemory, selectRelevantMemories } from "./memory";

describe("memory core", () => {
  it("extracts explicit safe memory", () => assert.equal(extractExplicitMemory("Luna, merke dir: Ich arbeite am Luna-Projekt."), "Ich arbeite am Luna-Projekt."));
  it("rejects credential-like memory", () => {
    assert.equal(containsSensitiveMemory("Luna, merke dir meinen API key sk-abcdefghijklmnopqrstuvwxyz"), true);
    assert.equal(extractExplicitMemory("Luna, merke dir meinen API key sk-abcdefghijklmnopqrstuvwxyz"), null);
  });
  it("normalizes bounds and whitespace", () => assert.deepEqual(normalizeMemory({ type: "fact", content: "  Hallo   Welt  ", importance: 4 }), { type: "fact", content: "Hallo Welt", importance: 1 }));
  it("creates stable fingerprints", () => assert.equal(memoryFingerprint("preference", "  Deutsch  "), memoryFingerprint("preference", "deutsch")));
  it("ranks relevant memories and respects a safe limit", () => {
    const memories = [
      { id: "1", userId: "u", type: "fact" as const, content: "Luna Projekt aktiv", importance: 0.5, metadata: {} },
      { id: "2", userId: "u", type: "fact" as const, content: "Kochen", importance: 0.9, metadata: {} },
    ];
    assert.equal(selectRelevantMemories(memories, "Luna Projekt", 1)[0]?.id, "1");
  });
});
