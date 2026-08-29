export type LunaState = "idle" | "planning" | "running" | "waiting" | "completed" | "failed";
export type LunaStateRecord = { state: LunaState; updatedAt: string; reason?: string };
export function transitionState(current: LunaState, next: LunaState): LunaStateRecord {
  return { state: next, updatedAt: new Date().toISOString(), reason: `${current} -> ${next}` };
}
