import assert from "node:assert/strict";
import test from "node:test";
import { assessIntelligence } from "./intelligence-core";

test("protects secrets from learning and memory candidates", () => {
  const result = assessIntelligence({ userId: "u1", message: "Mein API key ist abc123" });
  assert.equal(result.learningSignals.length, 0);
  assert.equal(result.memoryCandidates.length, 0);
});

test("captures explicit preferences as learning signals without persisting them", () => {
  const result = assessIntelligence({ userId: "u1", message: "Ich liebe klare Antworten und möchte kurze Erklärungen." });
  assert.ok(result.learningSignals.length > 0);
  assert.ok(result.learningSignals.some((signal) => signal.type === "preference"));
  assert.ok(result.memoryCandidates.some((memory) => memory.type === "preference"));
});

test("captures goals and projects as higher-importance memory candidates", () => {
  const result = assessIntelligence({ userId: "u1", message: "Mein Projekt Luna ist mir wichtig und ich will es fertig bauen." });
  assert.ok(result.learningSignals.some((signal) => signal.type === "project"));
  assert.ok(result.learningSignals.some((signal) => signal.type === "goal"));
  assert.ok(result.memoryCandidates.every((memory) => memory.importance >= 0.7));
});

test("marks uncertainty instead of pretending certainty", () => {
  const result = assessIntelligence({ userId: "u1", message: "Ich weiß es nicht, vielleicht ist das die richtige Lösung." });
  assert.equal(result.epistemic, "unknown");
  assert.ok(result.truthRules.includes("Never present an inference as a verified fact."));
});

test("can signal that a focused getting-to-know-you follow-up is useful", () => {
  const result = assessIntelligence({ userId: "u1", message: "Mein Ziel ist, Luna wirklich intelligent zu machen." });
  assert.equal(result.followUp.relevant, false);
  const followUp = assessIntelligence({ userId: "u1", message: "Das ist mir sehr wichtig für Luna." });
  assert.equal(followUp.followUp.relevant, true);
  assert.ok(followUp.followUp.suggestedQuestion);
});

test("does not invent a follow-up for ordinary conversation", () => {
  const result = assessIntelligence({ userId: "u1", message: "Heute regnet es." });
  assert.equal(result.followUp.relevant, false);
});
