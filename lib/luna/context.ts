import type { LunaContext } from "./types";

export type LunaRuntimeContext = LunaContext & {
  recentMessages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  memories: Array<{ type: string; content: string; importance: number }>;
};

export function createRuntimeContext(
  context: LunaContext,
  recentMessages: LunaRuntimeContext["recentMessages"] = [],
  memories: LunaRuntimeContext["memories"] = [],
): LunaRuntimeContext {
  return { ...context, recentMessages, memories };
}
