import { describe, expect, it } from "vitest";
import { containsSensitiveMemory, extractExplicitMemory, memoryFingerprint, normalizeMemory, selectRelevantMemories } from "./memory";

describe("memory core", () => {
  it("extracts explicit safe memory", () => {
    expect(extractExplicitMemory("Luna, merke dir: Ich arbeite am Luna-Projekt.")).toBe("Ich arbeite am Luna-Projekt.");
  });

  it("rejects credential-like memory", () => {
    expect(containsSensitiveMemory("Luna, merke dir meinen API key sk-abcdefghijklmnopqrstuvwxyz")).toBe(true);
    expect(extractExplicitMemory("Luna, merke dir meinen API key sk-abcdefghijklmnopqrstuvwxyz")).toBeNull();
  });

  it("normalizes bounds and whitespace", () => {
    expect(normalizeMemory({ type: "fact", content: "  Hallo   Welt  ", importance: 4 })).toEqual({ type: "fact", content: "Hallo Welt", importance: 1 });
  });

  it("creates stable fingerprints", () => {
    expect(memoryFingerprint("preference", "  Deutsch  ")).toBe(memoryFingerprint("preference", "deutsch"));
  });

  it("ranks relevant memories and respects a safe limit", () => {
    const memories = [
      { id: "1", userId: "u", type: "fact" as const, content: "Luna Projekt aktiv", importance: 0.5, metadata: {} },
      { id: "2", userId: "u", type: "fact" as const, content: "Kochen", importance: 0.9, metadata: {} },
    ];
    expect(selectRelevantMemories(memories, "Luna Projekt", 1)[0]?.id).toBe("1");
  });
});
