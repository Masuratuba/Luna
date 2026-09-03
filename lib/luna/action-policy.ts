import type { LunaAction } from "./core";

export type LunaRisk = "safe" | "sensitive" | "destructive";

export type ActionPolicyDecision = {
  allowed: boolean;
  requiresConfirmation: boolean;
  risk: LunaRisk;
  reason: string;
};

const TOOL_POLICY: Record<string, { risk: LunaRisk; requiresConfirmation: boolean }> = {
  search: { risk: "safe", requiresConfirmation: false },
  "memory.read": { risk: "safe", requiresConfirmation: false },
  "memory.write": { risk: "sensitive", requiresConfirmation: false },
  "task.create": { risk: "sensitive", requiresConfirmation: false },
  "external.send": { risk: "destructive", requiresConfirmation: true },
  "data.delete": { risk: "destructive", requiresConfirmation: true },
};

export function evaluateActionPolicy(
  action: LunaAction,
  context: { authenticated: boolean; approved?: boolean },
): ActionPolicyDecision {
  if (!context.authenticated) {
    return { allowed: false, requiresConfirmation: false, risk: "destructive", reason: "authentication required" };
  }

  if (action.type === "tool") {
    const tool = String(action.input.tool ?? "").trim();
    if (!tool) {
      return { allowed: false, requiresConfirmation: false, risk: "destructive", reason: "tool name required" };
    }

    const rule = TOOL_POLICY[tool];
    if (!rule) {
      return { allowed: false, requiresConfirmation: true, risk: "destructive", reason: `tool not permitted: ${tool}` };
    }

    if (rule.requiresConfirmation && context.approved !== true) {
      return { allowed: false, requiresConfirmation: true, risk: rule.risk, reason: "explicit confirmation required" };
    }

    return { allowed: true, requiresConfirmation: rule.requiresConfirmation, risk: rule.risk, reason: "policy allowed" };
  }

  if (action.type === "memory") {
    return { allowed: true, requiresConfirmation: false, risk: "sensitive", reason: "policy allowed" };
  }

  if (action.type === "task") {
    return { allowed: true, requiresConfirmation: false, risk: "sensitive", reason: "policy allowed" };
  }

  return { allowed: false, requiresConfirmation: true, risk: "destructive", reason: "unknown action type" };
}

export function actionPolicyTruthRules(): string[] {
  return [
    "Policy is a mandatory execution gate, not documentation only.",
    "Unauthenticated actions fail closed.",
    "Unknown tools fail closed and are treated as destructive.",
    "Destructive tools require explicit approval before execution.",
    "Policy approval never replaces Guardian authorization.",
    "Policy never grants permission to bypass the Guardian Gateway.",
  ];
}
