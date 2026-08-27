export type LunaAction = "read" | "write" | "delete" | "execute";

export function canPerformAction(action: LunaAction, authenticated: boolean) {
  if (!authenticated) return false;
  return ["read", "write", "delete", "execute"].includes(action);
}
