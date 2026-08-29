export type LunaProfile = {
  userId: string;
  displayName?: string | null;
  preferences: Record<string, unknown>;
};

export function createProfile(userId: string, displayName?: string | null, preferences: Record<string, unknown> = {}): LunaProfile {
  if (!userId) throw new Error("userId is required");
  return { userId, displayName: displayName?.trim() || null, preferences };
}
