import assert from "node:assert/strict";
import test from "node:test";
import { agentForTask } from "./agent-orchestrator";

test("agentForTask routes common tasks to the correct agent", () => {
  const cases: Array<[string, string]> = [
    ["Recherchiere aktuelle Informationen", "research"],
    ["Merk dir, dass ich Deutsch bevorzuge", "memory"],
    ["Plane die nächsten Schritte", "planner"],
    ["Schick diese E-Mail", "action"],
    ["Prüfe das Sicherheitsrisiko", "security"],
    ["Analysiere diese Zahlen", "analysis"],
    ["Öffne und extrahiere die PDF", "document"],
    ["Debug diesen TypeScript-Code", "coding"],
    ["Vergleiche die Produkte und Preise", "shop"],
    ["Erkläre mir das", "luna"],
  ];

  for (const [message, expected] of cases) {
    assert.equal(agentForTask(message), expected, message);
  }
});
