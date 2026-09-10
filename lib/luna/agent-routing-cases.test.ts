import { describe, expect, it } from "vitest";
import { agentForTask } from "./agent-orchestrator";

describe("agentForTask", () => {
  it.each([
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
  ])("routes %s to %s", (message, expected) => {
    expect(agentForTask(message)).toBe(expected);
  });
});
