import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseLunaCommand } from "./command-capabilities";

describe("Luna command capabilities", () => {
  it("parses direct forget", () => assert.deepEqual(parseLunaCommand("Luna, vergiss meine alte Präferenz"), { kind: "forget", query: "meine alte Präferenz" }));
  it("parses natural German forget requests", () => {
    assert.deepEqual(parseLunaCommand("Bitte vergiss, dass ich gerne reise."), { kind: "forget", query: "dass ich gerne reise." });
    assert.deepEqual(parseLunaCommand("Lösche, dass ich gerne reise."), { kind: "forget", query: "dass ich gerne reise." });
  });
  it("does not confuse memory save with forget", () => assert.equal(parseLunaCommand("Merke dir, dass ich gerne reise."), null));
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
