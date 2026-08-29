import type { LunaRuntimeContext } from "./context";

export type PersonalContext = {
  userId: string;
  profile: Record<string, unknown>;
  relevantMemories: LunaRuntimeContext["memories"];
  recentMessages: LunaRuntimeContext["recentMessages"];
};

export function buildPersonalContext(context: LunaRuntimeContext, profile: Record<string, unknown> = {}): PersonalContext {
  return { userId: context.userId, profile, relevantMemories: context.memories, recentMessages: context.recentMessages };
}
