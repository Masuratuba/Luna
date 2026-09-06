import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseLunaCommand } from "./command-capabilities";

describe("Luna command capabilities", () => {
  it("parses forget", () => assert.deepEqual(parseLunaCommand("Luna, vergiss meine alte Präferenz"), { kind: "forget", query: "meine alte Präferenz" }));
  it("parses update", () => assert.deepEqual(parseLunaCommand("Luna, aktualisiere mein Ziel zu Tuba fertigstellen"), { kind: "update", query: "mein Ziel", replacement: "Tuba fertigstellen" }));
  it("parses context", () => assert.deepEqual(parseLunaCommand("Luna, Kontext"), { kind: "context" }));
  it("parses verify", () => assert.deepEqual(parseLunaCommand("Luna, prüf das"), { kind: "verify", target: "das" }));
  it("parses next, continue and think aliases", () => {
    assert.deepEqual(parseLunaCommand("Luna, was jetzt?"), { kind: "next" });
    assert.deepEqual(parseLunaCommand("Luna, mach weiter"), { kind: "continue" });
    assert.deepEqual(parseLunaCommand("Luna, denk selbst"), { kind: "think" });
    assert.deepEqual(parseLunaCommand("Luna, denke selbst"), { kind: "think" });
    assert.deepEqual(parseLunaCommand("Luna, denk weiter"), { kind: "think" });
    assert.deepEqual(parseLunaCommand("Luna, denke weiter"), { kind: "think" });
  });
  it("does not capture ordinary chat", () => assert.equal(parseLunaCommand("Wie geht es dir?"), null));
});
