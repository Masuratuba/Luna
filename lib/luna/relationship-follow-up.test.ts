import assert from "node:assert/strict";
import test from "node:test";
import { assessIntelligence } from "./intelligence-core";
import {
  buildFollowUpItems,
  markFollowUpDismissed,
  mergeFollowUpItems,
  selectFollowUp,
  snoozeFollowUp,
} from "./relationship-follow-up";

const NOW = "2026-09-03T18:00:00.000Z";

test("creates follow-up candidates from goals, projects, and habits", () => {
  const assessment = assessIntelligence({
    userId: "u1",
    message: "Mein Ziel ist Luna fertig zu bauen und ich mache normalerweise jeden Tag daran weiter.",
  });
  const items = buildFollowUpItems("u1", assessment, NOW);

  assert.equal(items.length, 2);
  assert.ok(items.some((item) => item.priority === "high"));
  assert.ok(items.every((item) => item.status === "open"));
});

test("cooldown prevents immediate repeated follow-up", () => {
  const assessment = assessIntelligence({ userId: "u1", message: "Mein Projekt ist Luna." });
  const items = buildFollowUpItems("u1", assessment, NOW);

  assert.equal(selectFollowUp(items, NOW), null);
  assert.ok(selectFollowUp(items, "2026-09-04T18:00:00.000Z"));
});

test("duplicate topics merge instead of creating repeated open loops", () => {
  const assessment = assessIntelligence({ userId: "u1", message: "Mein Projekt ist Luna." });
  const first = buildFollowUpItems("u1", assessment, NOW);
  const second = buildFollowUpItems("u1", assessment, "2026-09-04T18:00:00.000Z");

  const merged = mergeFollowUpItems(first, second);
  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.lastMentionedAt, "2026-09-04T18:00:00.000Z");
});

test("dismissal creates a durable boundary in the follow-up object", () => {
  const assessment = assessIntelligence({ userId: "u1", message: "Mein Ziel ist Urlaub." });
  const item = buildFollowUpItems("u1", assessment, NOW)[0]!;
  const dismissed = markFollowUpDismissed(item);

  assert.equal(dismissed.status, "dismissed");
  assert.equal(dismissed.userBoundary, "do_not_follow_up");
  assert.equal(selectFollowUp([dismissed], "2026-09-10T18:00:00.000Z"), null);
});

test("snoozed item becomes eligible again at the requested time", () => {
  const assessment = assessIntelligence({ userId: "u1", message: "Mein Ziel ist Urlaub." });
  const item = buildFollowUpItems("u1", assessment, NOW)[0]!;
  const snoozed = snoozeFollowUp(item, 2, NOW);

  assert.equal(selectFollowUp([snoozed], "2026-09-03T19:59:59.000Z"), null);
  assert.ok(selectFollowUp([snoozed], "2026-09-03T20:00:00.000Z"));
});
