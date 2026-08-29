import type { LunaAction } from "./core";
import type { LunaDecision } from "./types";
import { getToolPermission } from "./permissions";
import type { PermissionLevel } from "./permissions";

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
};

export type GuardResult = {
  decision: GuardDecision;
  allowed: boolean;
  risk: GuardRisk;
  reason: string;
};

const CRITICAL_TOOLS = new Set([
  "external.send",
  "data.delete",
  "wallet.transfer",
  "wallet.withdraw",
  "wallet.sign",
  "payment.charge",
  "payment.refund",
  "credential.request",
  "secret.read",
]);

const PROTECTED_TOOLS = new Set([
  "memory.write",
  "task.create",
  "external.publish",
  "shop.update",
  "shop.publish",
  "pricing.update",
]);

const CRITICAL_PATTERNS = [
  /\b(lösche|loesche|delete|entferne|remove)\b/i,
  /\b(sende|send|verschicke|transfer|überweise|ueberweise)\b/i,
  /\b(passwort|password|api[- ]?key|secret|token|private[- ]?key)\b/i,
];

function toolName(action: LunaAction): string {
  return action.type === "tool" ? String(action.input.tool ?? "") : "";
}

export function classifyRisk(action: LunaAction): GuardRisk {
  const tool = toolName(action);

  if (CRITICAL_TOOLS.has(tool) || (action.type === "task" && action.input.destructive === true)) {
    return "CRITICAL";
  }

  if (PROTECTED_TOOLS.has(tool) || action.type === "memory" || action.type === "task") {
    return "PROTECTED";
  }

  if (action.type === "tool" && tool.length > 0) return "CRITICAL";
  if (action.type === "tool") return "CRITICAL";

  return "SAFE";
}

/**
 * Independent authorization decision.
 *
 * The Guard does not call agents, models, providers, wallets or tools.
 * Agents cannot modify its policy or grant themselves permissions.
 * Unknown actions fail closed.
 */
export function checkGuard(request: GuardRequest): GuardResult {
  const risk = classifyRisk(request.action);

  if (!request.authenticated) {
    return { decision: "DENY", allowed: false, risk, reason: "authentication required" };
  }

  if (risk === "SAFE") {
    return { decision: "ALLOW", allowed: true, risk, reason: "safe action" };
  }

  if (risk === "PROTECTED") {
    if (request.approved === true) {
      return { decision: "ALLOW", allowed: true, risk, reason: "explicit approval present" };
    }

    return {
      decision: "REQUIRE_APPROVAL",
      allowed: false,
      risk,
      reason: "protected action requires explicit approval",
    };
  }

  // Critical operations require explicit approval plus a confirmation token.
  // No agent or role can bypass this boundary.
  if (request.approved === true && Boolean(request.confirmationToken?.trim())) {
    return { decision: "ALLOW", allowed: true, risk, reason: "critical action explicitly confirmed" };
  }

  return {
    decision: "DENY",
    allowed: false,
    risk,
    reason: "critical action blocked without explicit confirmation",
  };
}

export function guardAllows(request: GuardRequest): boolean {
  return checkGuard(request).allowed;
}

/**
 * Backwards-compatible message-level check used by the existing Luna core.
 * New execution paths should use checkGuard() with a concrete LunaAction.
 */
export type GuardInput = {
  userId: string;
  message: string;
  decision: LunaDecision;
  toolName?: string;
};

export function evaluateGuard(input: GuardInput): GuardResult {
  if (!input.userId || input.userId === "local") {
    return { decision: "DENY", allowed: false, risk: "CRITICAL", reason: "authenticated user required" };
  }

  if (CRITICAL_PATTERNS.some((pattern) => pattern.test(input.message))) {
    return { decision: "DENY", allowed: false, risk: "CRITICAL", reason: "action requires explicit confirmation" };
  }

  if (input.toolName) {
    const permission = getToolPermission(input.toolName);
    if (permission.requiresConfirmation) {
      return { decision: "DENY", allowed: false, risk: "CRITICAL", reason: "tool requires explicit confirmation" };
    }
    return {
      decision: "ALLOW",
      allowed: true,
      risk: permission.level === "read" ? "SAFE" : "PROTECTED",
      reason: "tool permitted by policy",
    };
  }

  if (["USE_TOOL", "CREATE_TASK", "SAVE_MEMORY"].includes(input.decision)) {
    return {
      decision: "REQUIRE_APPROVAL",
      allowed: false,
      risk: "PROTECTED",
      reason: "protected action requires explicit approval",
    };
  }

  return { decision: "ALLOW", allowed: true, risk: "SAFE", reason: "safe request" };
}

export function getGuardPolicy() {
  return {
    failClosed: true,
    agentControlled: false,
    executionEnabled: false,
    risks: ["SAFE", "PROTECTED", "CRITICAL"] as const,
    decisions: ["ALLOW", "REQUIRE_APPROVAL", "DENY"] as const,
    criticalTools: [...CRITICAL_TOOLS],
    protectedTools: [...PROTECTED_TOOLS],
  };
}
