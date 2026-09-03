import { describe, expect, it } from "vitest";
import { assessIntelligence } from "./intelligence-core";

describe("intelligence core", () => {
  it("protects secrets from learning and memory candidates", () => {
    const result = assessIntelligence({ userId: "u1", message: "Mein API key ist abc123" });
    expect(result.learningSignals).toHaveLength(0);
    expect(result.memoryCandidates).toHaveLength(0);
  });

  it("captures explicit preferences as learning signals without persisting them", () => {
    const result = assessIntelligence({ userId: "u1", message: "Ich liebe klare Antworten und möchte kurze Erklärungen." });
    expect(result.learningSignals.length).toBeGreaterThan(0);
    expect(result.learningSignals.some((signal) => signal.type === "preference")).toBe(true);
    expect(result.memoryCandidates.some((memory) => memory.type === "preference")).toBe(true);
  });

  it("captures goals and projects as higher-importance memory candidates", () => {
    const result = assessIntelligence({ userId: "u1", message: "Mein Projekt Luna ist mir wichtig und ich will es fertig bauen." });
    expect(result.learningSignals.some((signal) => signal.type === "project")).toBe(true);
    expect(result.learningSignals.some((signal) => signal.type === "goal")).toBe(true);
    expect(result.memoryCandidates.every((memory) => memory.importance >= 0.7)).toBe(true);
  });

  it("marks uncertainty instead of pretending certainty", () => {
    const result = assessIntelligence({ userId: "u1", message: "Ich weiß es nicht, vielleicht ist das die richtige Lösung." });
    expect(result.epistemic).toBe("unknown");
    expect(result.truthRules).toContain("Never present an inference as a verified fact.");
  });

  it("can signal that a focused getting-to-know-you follow-up is useful", () => {
    const result = assessIntelligence({ userId: "u1", message: "Mein Ziel ist, Luna wirklich intelligent zu machen." });
    expect(result.followUp.relevant).toBe(false);
    const followUp = assessIntelligence({ userId: "u1", message: "Das ist mir sehr wichtig für Luna." });
    expect(followUp.followUp.relevant).toBe(true);
    expect(followUp.followUp.suggestedQuestion).toBeTruthy();
  });

  it("does not invent a follow-up for ordinary conversation", () => {
    const result = assessIntelligence({ userId: "u1", message: "Heute regnet es." });
    expect(result.followUp.relevant).toBe(false);
  });
});
