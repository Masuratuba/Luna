import type { LunaAction } from "./core";
import type { LunaDecision } from "./types";
import { getToolPermission } from "./permissions";
import type { PermissionLevel } from "./permissions";
import { TrustedAdminContext } from "./trusted-auth";

/** Independent security boundary. Agents cannot modify or bypass this module. */
/** The Guard is fail-closed by default: anything not explicitly authorized is blocked. */
export type GuardRisk = "SAFE" | "PROTECTED" | "CRITICAL";
export type GuardDecision = "ALLOW" | "REQUIRE_APPROVAL" | "DENY";
export type GuardRole = "user" | "agent" | "service" | "admin";
export type ToolPermission = { tool: string; level: PermissionLevel; requiresConfirmation: boolean };
export { getToolPermission };

export type GuardRequest = {
  action: LunaAction;
  authenticated: boolean;
  role?: GuardRole;
  approved?: boolean;
  confirmationToken?: string;
  /** Only a verifier-created context can establish trusted admin status. */
  trustedAdmin?: TrustedAdminContext;
};
export type GuardResult = { decision: GuardDecision; allowed: boolean; risk: GuardRisk; reason: string };

const CRITICAL_TOOLS = new Set(["external.send", "data.delete", "wallet.transfer", "wallet.withdraw", "wallet.sign", "payment.charge", "payment.refund", "credential.request", "secret.read"]);
const PROTECTED_TOOLS = new Set(["memory.write", "task.create", "external.publish", "shop.update", "shop.publish", "pricing.update"]);
const CRITICAL_PATTERNS = [/\b(lösche|loesche|delete|entferne|remove)\b/i, /\b(sende|send|verschicke|transfer|überweise|ueberweise)\b/i, /\b(passwort|password|api[- ]?key|secret|token|private[- ]?key)\b/i];

function isTrustedAdmin(context?: TrustedAdminContext): boolean {
  return context instanceof TrustedAdminContext && context.trusted === true && context.role === "admin";
}

function toolName(action: LunaAction): string { return action.type === "tool" ? String(action.input.tool ?? "") : ""; }
export function classifyRisk(action: LunaAction): GuardRisk {
  const tool = toolName(action);
  if (CRITICAL_TOOLS.has(tool) || (action.type === "task" && action.input.destructive === true)) return "CRITICAL";
  if (PROTECTED_TOOLS.has(tool) || action.type === "memory" || action.type === "task") return "PROTECTED";
  if (action.type === "tool") {
    const permission = getToolPermission(tool);
    if (permission.level === "read" && !permission.requiresConfirmation) return "SAFE";
    return "CRITICAL";
  }
  return "SAFE";
}

export function checkGuard(request: GuardRequest): GuardResult {
  const risk = classifyRisk(request.action);
  const trustedAdmin = isTrustedAdmin(request.trustedAdmin);
  if (!request.authenticated && !trustedAdmin) return { decision: "DENY", allowed: false, risk, reason: "authentication required" };
  if (risk === "SAFE") return { decision: "ALLOW", allowed: true, risk, reason: "safe action" };
  if (trustedAdmin) return { decision: "ALLOW", allowed: true, risk, reason: "trusted admin authorization" };
  if (risk === "PROTECTED") {
    if (request.approved === true) return { decision: "ALLOW", allowed: true, risk, reason: "explicit approval present" };
    return { decision: "REQUIRE_APPROVAL", allowed: false, risk, reason: "protected action requires explicit approval" };
  }
  if (request.approved === true && Boolean(request.confirmationToken?.trim())) return { decision: "ALLOW", allowed: true, risk, reason: "critical action explicitly confirmed" };
  return { decision: "DENY", allowed: false, risk, reason: "critical action blocked without explicit confirmation" };
}
export function guardAllows(request: GuardRequest): boolean { return checkGuard(request).allowed; }

export type GuardInput = { userId: string; message: string; decision: LunaDecision; toolName?: string; role?: GuardRole; trustedAdmin?: TrustedAdminContext };
export function evaluateGuard(input: GuardInput): GuardResult {
  const trustedAdmin = isTrustedAdmin(input.trustedAdmin);
  if ((!input.userId || input.userId === "local") && !trustedAdmin) return { decision: "DENY", allowed: false, risk: "CRITICAL", reason: "authenticated user required" };
  if (CRITICAL_PATTERNS.some((pattern) => pattern.test(input.message)) && !trustedAdmin) return { decision: "DENY", allowed: false, risk: "CRITICAL", reason: "action requires explicit confirmation" };
  if (input.toolName) {
    const permission = getToolPermission(input.toolName);
    if (permission.requiresConfirmation && !trustedAdmin) return { decision: "DENY", allowed: false, risk: "CRITICAL", reason: "tool requires explicit confirmation" };
    return { decision: "ALLOW", allowed: true, risk: trustedAdmin ? "PROTECTED" : permission.level === "read" ? "SAFE" : "PROTECTED", reason: trustedAdmin ? "trusted admin authorization" : "tool permitted by policy" };
  }
  // A research/search decision is a read-only capability request. It must still
  // pass the research agent capability gate and provider boundary before use.
  // Privileged tool actions remain protected by checkGuard/Guardian Gateway.
  if (input.decision === "USE_TOOL" && !trustedAdmin) return { decision: "ALLOW", allowed: true, risk: "SAFE", reason: "read-only research request" };
  if (["CREATE_TASK", "SAVE_MEMORY"].includes(input.decision) && !trustedAdmin) return { decision: "REQUIRE_APPROVAL", allowed: false, risk: "PROTECTED", reason: "protected action requires explicit approval" };
  return { decision: "ALLOW", allowed: true, risk: "SAFE", reason: trustedAdmin ? "trusted admin authorization" : "safe request" };
}
export function getGuardPolicy() {
  return { failClosed: true, independentFromAgents: true, adminRequiresTrustedAuthentication: true, risks: ["SAFE", "PROTECTED", "CRITICAL"] as const, decisions: ["ALLOW", "REQUIRE_APPROVAL", "DENY"] as const, criticalTools: [...CRITICAL_TOOLS], protectedTools: [...PROTECTED_TOOLS] };
}
