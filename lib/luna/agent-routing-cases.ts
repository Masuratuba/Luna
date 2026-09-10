import type { LunaAgentId } from "./agents";
import { agentForTask } from "./agent-orchestrator";

export const agentRoutingCases: ReadonlyArray<readonly [string, LunaAgentId]> = [
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

export function validateAgentRoutingCases(): string[] {
  return agentRoutingCases.flatMap(([message, expected]) => {
    const actual = agentForTask(message);
    return actual === expected ? [] : [`${expected}: ${message} -> ${actual}`];
  });
}
