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

export function buildMemoryQuery(userId: string, query: string) {
  return { userId, query: query.trim() };
}

export function shouldRemember(message: string): boolean {
  return /\b(merke|merk dir|speicher|vergiss nicht|erinnere dich)\b/i.test(message);
}

export function normalizeMemory(candidate: MemoryCandidate): MemoryCandidate {
  return {
    type: candidate.type,
    content: candidate.content.trim().slice(0, 2000),
    importance: Math.min(5, Math.max(1, Math.round(candidate.importance))),
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
