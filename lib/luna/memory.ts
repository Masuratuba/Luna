export type MemoryType = "personal" | "preference" | "project" | "decision" | "fact" | "instruction";

export type Memory = {
  id: string;
  userId: string;
  type: MemoryType;
  content: string;
  importance: number;
  metadata: Record<string, unknown>;
};

export type MemoryCandidate = { type: MemoryType; content: string; importance: number };

const MEMORY_TRIGGER = /\b(merke(?:\s+dir)?|merk(?:e)?\s+dir|speicher(?:e)?|vergiss\s+nicht)\b/i;
const SECRET_PATTERN = /\b(api[_ -]?key|passwort|password|secret|token|private[_ -]?key)\b/i;

export function buildMemoryQuery(userId: string, query: string) {
  return { userId, query: query.trim() };
}

export function shouldRemember(message: string): boolean {
  return MEMORY_TRIGGER.test(message);
}

export function extractExplicitMemory(message: string): string | null {
  if (!shouldRemember(message) || SECRET_PATTERN.test(message)) return null;
  const content = message
    .replace(/^\s*(bitte\s+)?(merke(?:\s+dir)?|merk\s+dir|speicher(?:e)?|vergiss\s+nicht)\s*[:,-]?\s*/i, "")
    .trim();
  return content ? content.slice(0, 10000) : null;
}

export function normalizeMemory(candidate: MemoryCandidate): MemoryCandidate {
  return {
    type: candidate.type,
    content: candidate.content.trim().slice(0, 10000),
    importance: Math.min(1, Math.max(0, candidate.importance)),
  };
}

export function selectRelevantMemories(memories: Memory[], query: string, limit = 12): Memory[] {
  const terms = query.toLowerCase().split(/\s+/).filter((term) => term.length > 2);
  return [...memories]
    .map((memory) => ({ memory, score: terms.reduce((score, term) => score + (memory.content.toLowerCase().includes(term) ? 1 : 0), 0) }))
    .sort((a, b) => b.score - a.score || b.memory.importance - a.memory.importance)
    .slice(0, limit)
    .map(({ memory }) => memory);
}
