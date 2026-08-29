export type LunaFeedback = { userId: string; actionId?: string; rating: "positive" | "negative"; note?: string; createdAt: string };
export function createFeedback(input: Omit<LunaFeedback, "createdAt">): LunaFeedback { return { ...input, createdAt: new Date().toISOString() }; }
