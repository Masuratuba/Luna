import type { LunaDecision } from "./types";

export function routeMessage(message: string): LunaDecision {
  const text = message.trim().toLowerCase();

  if (!text) return "ASK_CLARIFICATION";
  if (/\b(merke|merk dir|speicher|vergiss nicht)\b/.test(text)) return "SAVE_MEMORY";
  if (/\b(aufgabe|task|erinnere mich|deadline)\b/.test(text)) return "CREATE_TASK";
  if (/\b(recherch|suche|github|outlook|internet|web)\b/.test(text)) return "USE_TOOL";
  if (/\b(erinnerst du dich|was weißt du|was hatten wir)\b/.test(text)) return "USE_MEMORY";

  return "ANSWER";
}
