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
const SECRET_PATTERN = /\b(api[_ -]?key|passwort|password|secret|token|private[_ -]?key|zugangsdaten|credentials)\b/i;
const SENSITIVE_VALUE_PATTERN = /(?:^|\s)(?:sk-[A-Za-z0-9_-]{16,}|sb_(?:publishable|secret)_[A-Za-z0-9_-]{10,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})(?:\s|$)/;

export function buildMemoryQuery(userId: string, query: string) {
  return { userId, query: query.trim().slice(0, 500) };
}

export function shouldRemember(message: string): boolean {
  return MEMORY_TRIGGER.test(message);
}

export function containsSensitiveMemory(message: string): boolean {
  return SECRET_PATTERN.test(message) || SENSITIVE_VALUE_PATTERN.test(message);
}

export function extractExplicitMemory(message: string): string | null {
  if (!shouldRemember(message) || containsSensitiveMemory(message)) return null;
  const content = message
    .replace(/^\s*(bitte\s+)?(merke(?:\s+dir)?|merk\s+dir|speicher(?:e)?|vergiss\s+nicht)\s*[:,-]?\s*/i, "")
    .trim();
  return content ? content.slice(0, 10000) : null;
}

export function normalizeMemory(candidate: MemoryCandidate): MemoryCandidate {
  const content = candidate.content.trim().replace(/\s+/g, " ").slice(0, 10000);
  return {
    type: candidate.type,
    content,
    importance: Math.min(1, Math.max(0, candidate.importance)),
  };
}

export function memoryFingerprint(type: MemoryType, content: string): string {
  return `${type}:${content.trim().toLocaleLowerCase("de-DE")}`;
}

export function selectRelevantMemories(memories: Memory[], query: string, limit = 12): Memory[] {
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
  const terms = query.toLowerCase().split(/\s+/).filter((term) => term.length > 2);
  return [...memories]
    .map((memory) => ({
      memory,
      score: terms.reduce((score, term) => score + (memory.content.toLowerCase().includes(term) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score || b.memory.importance - a.memory.importance)
    .slice(0, safeLimit)
    .map(({ memory }) => memory);
}
