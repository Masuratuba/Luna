import assert from "node:assert/strict";
import test from "node:test";
import { validateTaskFields, validateTaskTitle } from "./task-validation";

test("accepts valid task fields and defaults-compatible nulls", () => {
  assert.equal(validateTaskFields({ project_id: null, description: null, status: "todo", priority: 3, due_at: null }), null);
  assert.equal(validateTaskFields({ project_id: "123e4567-e89b-42d3-a456-426614174000", status: "completed", priority: 5, due_at: "2026-10-11T12:00:00Z" }), null);
});

test("rejects invalid project IDs, descriptions, statuses, priorities, and dates", () => {
  assert.match(validateTaskFields({ project_id: "not-a-uuid" }) ?? "", /project_id/);
  assert.match(validateTaskFields({ description: 12 }) ?? "", /description/);
  assert.match(validateTaskFields({ status: "unknown" }) ?? "", /status/);
  for (const priority of [0, 6, 2.5, "3"]) assert.match(validateTaskFields({ priority }) ?? "", /priority/);
  assert.match(validateTaskFields({ due_at: "not-a-date" }) ?? "", /due_at/);
});

test("partial validation permits omitted fields but validates supplied fields", () => {
  assert.equal(validateTaskFields({}, true), null);
  assert.equal(validateTaskFields({ title: "Only title" }, true), null);
  assert.match(validateTaskFields({ priority: 8 }, true) ?? "", /priority/);
});

test("requires a non-empty task title and accepts surrounding whitespace", () => {
  assert.equal(validateTaskTitle("  Call restaurant  "), null);
  assert.equal(validateTaskTitle("   "), "title is required");
  assert.equal(validateTaskTitle(undefined), "title is required");
  assert.equal(validateTaskTitle(4), "title is required");
});
