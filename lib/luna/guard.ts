import type { LunaDecision } from "./types";

export type GuardRisk = "SAFE" | "PROTECTED" | "CRITICAL";
export type PermissionLevel = "read" | "write" | "destructive";
export type ToolPermission = { tool: string; level: PermissionLevel; requiresConfirmation: boolean };

const DEFAULT_PERMISSIONS: ToolPermission[] = [
  { tool: "memory.read", level: "read", requiresConfirmation: false },
  { tool: "memory.write", level: "write", requiresConfirmation: false },
  { tool: "task.create", level: "write", requiresConfirmation: false },
  { tool: "external.send", level: "destructive", requiresConfirmation: true },
  { tool: "data.delete", level: "destructive", requiresConfirmation: true },
];

export function getToolPermission(tool: string): ToolPermission {
  return DEFAULT_PERMISSIONS.find((permission) => permission.tool === tool) ?? { tool, level: "destructive", requiresConfirmation: true };
}

export type GuardInput = { userId: string; message: string; decision: LunaDecision; toolName?: string };
export type GuardResult = { allowed: boolean; risk: GuardRisk; reason: string };

const CRITICAL_PATTERNS = [
  /\b(lösche|loesche|delete|entferne|remove)\b/i,
  /\b(sende|send|verschicke|transfer|überweise|ueberweise)\b/i,
  /\b(passwort|password|api[- ]?key|secret|token)\b/i,
];
const PROTECTED_DECISIONS: LunaDecision[] = ["USE_TOOL", "CREATE_TASK", "SAVE_MEMORY"];

export function evaluateGuard(input: GuardInput): GuardResult {
  if (!input.userId || input.userId === "local") return { allowed: false, risk: "CRITICAL", reason: "authenticated user required" };
  if (CRITICAL_PATTERNS.some((pattern) => pattern.test(input.message))) return { allowed: false, risk: "CRITICAL", reason: "action requires explicit confirmation" };
  if (input.toolName) {
    const permission = getToolPermission(input.toolName);
    if (permission.requiresConfirmation) return { allowed: false, risk: "CRITICAL", reason: "tool requires explicit confirmation" };
    return { allowed: true, risk: permission.level === "read" ? "SAFE" : "PROTECTED", reason: "tool permitted by policy" };
  }
  if (PROTECTED_DECISIONS.includes(input.decision)) return { allowed: true, risk: "PROTECTED", reason: "protected action allowed by server-side policy" };
  return { allowed: true, risk: "SAFE", reason: "safe request" };
}
