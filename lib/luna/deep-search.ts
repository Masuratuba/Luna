export type DeepSearchOptions = {
  query: string;
  location?: { city?: string; country?: string; region?: string; timezone?: string };
};

export function buildDeepSearchInstructions(query: string): string {
  return [
    "Perform a deep web research task.",
    "Search broadly, prefer primary and authoritative sources, and cross-check important claims.",
    "Collect the information needed to answer the user's exact question.",
    "Distinguish facts, estimates, conflicting evidence, and uncertainty.",
    "Return a concise synthesis with source references when available.",
    `Research question: ${query.trim()}`,
  ].join("\n");
}

export function isSearchRequest(message: string): boolean {
  return /\b(recherch|deep\s*search|suche|such|web|internet|quellen|aktuell|neueste|latest)\b/i.test(message);
}
