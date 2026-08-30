import type { LunaAgentId } from "./agents";
import { evaluateAgentPolicy } from "./agent-policy";

export type AgentAccessMode = "read" | "write" | "execute";
export type AgentAccessGrant = {
  agent: LunaAgentId;
  capability: string;
  mode: AgentAccessMode;
  requiresApproval: boolean;
};

/** Server-side capability adapter. The technical policy is the source of truth. */
export function getAgentAccess(agent: LunaAgentId, capability: string, mode: AgentAccessMode) {
  const policy = evaluateAgentPolicy(agent, capability, mode);
  if (!policy.allowed) {
    return { allowed: false, requiresApproval: policy.requiresApproval, reason: policy.reason };
  }
  return { allowed: true, requiresApproval: policy.requiresApproval, reason: policy.reason };
}

export function listAgentGrants(agent: LunaAgentId): AgentAccessGrant[] {
  // Intentionally returns no implicit grants. Capabilities are evaluated per request.
  return [];
}

export function listShopGrants(): AgentAccessGrant[] {
  return [];
}
