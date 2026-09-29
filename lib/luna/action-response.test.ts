import assert from "node:assert/strict";
import test from "node:test";
import { buildActionFailureResponse } from "./action-response";

test("CP72 point 10: failed search returns a truthful failure reply and failed status", () => {
  const response = buildActionFailureResponse({
    decision: "USE_TOOL",
    agent: "research",
    actionId: "action-1",
    conversationId: "conversation-1",
    requiresApproval: false,
  });

  assert.equal(response.status, 502);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.actionStatus, "failed");
  assert.match(response.body.reply, /nicht verlässlich ausführen/i);
  assert.doesNotMatch(response.body.reply, /erledigt|erfolgreich|abgeschlossen/i);
});

test("CP72 point 10: approval-required action does not claim execution", () => {
  const response = buildActionFailureResponse({
    decision: "CREATE_TASK",
    agent: "planner",
    actionId: "action-2",
    conversationId: "conversation-2",
    requiresApproval: true,
  });

  assert.equal(response.status, 403);
  assert.equal(response.body.actionStatus, "failed");
  assert.match(response.body.reply, /ausdrückliche Freigabe/i);
  assert.doesNotMatch(response.body.reply, /erstellt|erledigt|erfolgreich/i);
});

test("CP72 point 10: task and memory failures receive decision-specific truthful replies", () => {
  const task = buildActionFailureResponse({
    decision: "CREATE_TASK",
    agent: "planner",
    actionId: "action-3",
    conversationId: "conversation-3",
    requiresApproval: false,
  });
  const memory = buildActionFailureResponse({
    decision: "SAVE_MEMORY",
    agent: "memory",
    actionId: "action-4",
    conversationId: "conversation-4",
    requiresApproval: false,
  });

  assert.match(task.body.reply, /konnte die Aufgabe nicht ausführen/i);
  assert.match(memory.body.reply, /konnte die Erinnerung nicht sicher speichern/i);
  assert.equal(task.body.actionStatus, "failed");
  assert.equal(memory.body.actionStatus, "failed");
});
