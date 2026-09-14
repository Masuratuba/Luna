import type { LunaDecision } from "./types";

export function routeMessage(message: string): LunaDecision {
  const text = message.trim().toLowerCase();

  if (!text) return "ASK_CLARIFICATION";
  if (/\b(merke|merk dir|speicher|vergiss nicht)\b/.test(text)) return "SAVE_MEMORY";
  if (/\b(aufgabe|task|erinnere mich|deadline)\b/.test(text)) return "CREATE_TASK";

  // Travel, prices, routes and availability are research intents even when
  // the user does not explicitly say "suche" or "recherchiere".
  const travelResearch =
    /\b(von\s+.+\s+nach\s+.+|nach\s+.+\s+am\s+\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?|bus|zug|bahn|flug|flugzeug|fahrt|reise|ticket|fahrkarte|fahrpreis|fahrplan|verbindung|route|preis|kosten|günstig|guenstig|billig|verfügbar|verfuegbar)\b/.test(text);
  if (travelResearch || /\b(recherch|suche|github|outlook|internet|web)\b/.test(text)) return "USE_TOOL";

  if (/\b(erinnerst du dich|was weißt du|was hatten wir)\b/.test(text)) return "USE_MEMORY";

  return "ANSWER";
}
