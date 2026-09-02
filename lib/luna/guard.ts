import type { LunaAction } from "./core";
import type { LunaDecision } from "./types";
import { getToolPermission } from "./permissions";
import type { PermissionLevel } from "./permissions";
import { TrustedAdminContext } from "./trusted-auth";

export type GuardRisk = "SAFE" | "PROTECTED" | "CRITICAL";
export type GuardDecision = "ALLOW" | "REQUIRE_APPROVAL" | "DENY";
export type GuardRole = "user" | "agent" | "service" | "admin";
export type ToolPermission = { tool: string; level: PermissionLevel; requiresConfirmation: boolean };
export { getToolPermission };
export type GuardRequest = { action: LunaAction; authenticated: boolean; role?: GuardRole; approved?: boolean; confirmationToken?: string; trustedAdmin?: TrustedAdminContext };
export type GuardResult = { decision: GuardDecision; allowed: boolean; risk: GuardRisk; reason: string };

const CRITICAL_TOOLS = new Set(["external.send", "data.delete", "shop.publish", "store.publish", "payments.execute", "payouts.execute", "wallet.transfer", "wallet.withdraw", "wallet.sign"]);
const PROTECTED_TOOLS = new Set(["memory.write", "task.create", "external.publish", "shop.update", "shop.publish", "pricing.update"]);
const CRITICAL_PATTERNS = [/\bdelete\b/i, /\bsend\b/i, /(password|api-key|secret|token|private-key)/i];

function isTrustedAdmin(context?: TrustedAdminContext) {
  return context instanceof TrustedAdminContext && context.trusted === true && context.role === "admin";
}

function toolName(action: LunaAction) {
  return action.type === "tool" ? String(action.input.tool ?? "") : "";
}

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
  if (risk === "SAFE") return { decision: "ALLOW", allowed: true, risk, reason: "safe action allowed" };
  if (trustedAdmin) return { decision: "ALLOW", allowed: true, risk, reason: "trusted admin allowed" };
  if (risk === "PROTECTED") {
    if (request.approved === true) return { decision: "ALLOW", allowed: true, risk, reason: "explicit approval accepted" };
    return { decision: "REQUIRE_APPROVAL", allowed: false, risk, reason: "explicit approval required" };
  }
  if (request.approved === true && Boolean(request.confirmationToken?.trim())) return { decision: "ALLOW", allowed: true, risk, reason: "explicit confirmation accepted" };
  return { decision: "DENY", allowed: false, risk, reason: "critical action requires confirmation" };
}

export function guardAllows(request: GuardRequest) {
  return checkGuard(request).allowed;
}

export type GuardInput = { userId: string; message: string; decision: LunaDecision; toolName?: string; role?: GuardRole; trustedAdmin?: TrustedAdminContext };

export function evaluateGuard(input: GuardInput): GuardResult {
  const trustedAdmin = isTrustedAdmin(input.trustedAdmin);
  if (!input.userId) return { decision: "DENY", allowed: false, risk: "CRITICAL", reason: "user identity required" };
  if (CRITICAL_PATTERNS.some((pattern) => pattern.test(input.message)) && !trustedAdmin) return { decision: "DENY", allowed: false, risk: "CRITICAL", reason: "message matches a protected operation pattern" };

  if (input.toolName) {
    const permission = getToolPermission(input.toolName);
    if (permission.requiresConfirmation && !trustedAdmin) return { decision: "REQUIRE_APPROVAL", allowed: false, risk: "CRITICAL", reason: "tool requires explicit confirmation" };
    return { decision: "ALLOW", allowed: true, risk: permission.level === "read" ? "SAFE" : "PROTECTED", reason: "tool permission granted" };
  }

  if (input.decision === "USE_TOOL" && !trustedAdmin) return { decision: "ALLOW", allowed: true, risk: "SAFE", reason: "read-only research request" };
  if ((input.decision === "CREATE_TASK" || input.decision === "SAVE_MEMORY") && !trustedAdmin) return { decision: "REQUIRE_APPROVAL", allowed: false, risk: "PROTECTED", reason: "explicit approval required" };
  return { decision: "ALLOW", allowed: true, risk: "SAFE", reason: "safe request allowed" };
}
