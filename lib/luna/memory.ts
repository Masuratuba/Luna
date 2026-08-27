export type MemoryType = "personal" | "preference" | "project" | "decision" | "fact" | "instruction";

export type Memory = {
  id: string;
  userId: string;
  type: MemoryType;
  content: string;
  importance: number;
  metadata: Record<string, unknown>;
};

export function buildMemoryQuery(userId: string, query: string) {
  return { userId, query };
}
