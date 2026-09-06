import { describe, expect, it } from "vitest";
import { parseLunaCommand } from "./command-capabilities";

describe("Luna command capabilities", () => {
  it("parses forget", () => expect(parseLunaCommand("Luna, vergiss meine alte Präferenz")).toEqual({ kind: "forget", query: "meine alte Präferenz" }));
  it("parses update", () => expect(parseLunaCommand("Luna, aktualisiere mein Ziel zu Tuba fertigstellen")).toEqual({ kind: "update", query: "mein Ziel", replacement: "Tuba fertigstellen" }));
  it("parses context", () => expect(parseLunaCommand("Luna, Kontext")).toEqual({ kind: "context" }));
  it("parses verify", () => expect(parseLunaCommand("Luna, prüf das")).toEqual({ kind: "verify", target: "das" }));
  it("parses next, continue and think", () => {
    expect(parseLunaCommand("Luna, was jetzt?")).toEqual({ kind: "next" });
    expect(parseLunaCommand("Luna, mach weiter")).toEqual({ kind: "continue" });
    expect(parseLunaCommand("Luna, denk selbst")).toEqual({ kind: "think" });
  });
  it("does not capture ordinary chat", () => expect(parseLunaCommand("Wie geht es dir?")).toBeNull());
});
