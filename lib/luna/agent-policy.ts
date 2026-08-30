import type { LunaAgentId } from "./agents";
import type { AgentAccessMode } from "./agent-isolation";

export type AgentRule = {
  agent: LunaAgentId;
  allowedCapabilities: readonly string[];
  deniedCapabilities: readonly string[];
  maxMode: AgentAccessMode;
  selfModify: false;
};

const ALL_DENIED: readonly string[] = [
  "guardian.modify",
  "policy.modify",
  "agent.modify",
  "secrets.read",
  "private-key.read",
  "credential.export",
  "code.execute",
];

const RULES: readonly AgentRule[] = [
  { agent: "luna", allowedCapabilities: ["orchestration", "routing", "conversation"], deniedCapabilities: ALL_DENIED, maxMode: "execute", selfModify: false },
  { agent: "research", allowedCapabilities: ["deep-search", "search", "research", "synthesis", "market-data"], deniedCapabilities: ALL_DENIED, maxMode: "read", selfModify: false },
  { agent: "memory", allowedCapabilities: ["memory.read", "memory.write", "recall", "context"], deniedCapabilities: ALL_DENIED, maxMode: "write", selfModify: false },
  { agent: "planner", allowedCapabilities: ["planning", "scheduling", "workflows", "task.create"], deniedCapabilities: ALL_DENIED, maxMode: "write", selfModify: false },
  { agent: "action", allowedCapabilities: ["tools", "execution", "queue"], deniedCapabilities: ALL_DENIED, maxMode: "execute", selfModify: false },
  { agent: "security", allowedCapabilities: ["security", "permissions", "risk", "audit.read"], deniedCapabilities: ALL_DENIED, maxMode: "read", selfModify: false },
  { agent: "document", allowedCapabilities: ["documents", "files", "extraction"], deniedCapabilities: ALL_DENIED, maxMode: "write", selfModify: false },
  { agent: "coding", allowedCapabilities: ["code", "debugging", "architecture"], deniedCapabilities: ALL_DENIED, maxMode: "write", selfModify: false },
  { agent: "analysis", allowedCapabilities: ["analysis", "evaluation", "reporting", "analytics"], deniedCapabilities: ALL_DENIED, maxMode: "read", selfModify: false },
  { agent: "shop", allowedCapabilities: ["shop", "product-research", "market-analysis", "deep-search", "analytics", "market-data", "catalog.read", "catalog.write", "content.write", "pricing.write", "store.read", "store.publish", "orders.read"], deniedCapabilities: [...ALL_DENIED, "payments.execute", "payouts.execute", "wallet.read", "wallet.transfer", "wallet.withdraw", "wallet.sign", "user.memory.read", "user.memory.write"], maxMode: "write", selfModify: false },
];

export function getAgentPolicy(agent: LunaAgentId): AgentRule | undefined {
  const rule = RULES.find((item) => item.agent === agent);
  return rule ? { ...rule, allowedCapabilities: [...rule.allowedCapabilities], deniedCapabilities: [...rule.deniedCapabilities] } : undefined;
}

export function evaluateAgentPolicy(agent: LunaAgentId, capability: string, mode: AgentAccessMode) {
  const rule = getAgentPolicy(agent);
  if (!rule) return { allowed: false, requiresApproval: true, reason: "agent has no policy" };
  if (rule.selfModify === false && ["guardian.modify", "policy.modify", "agent.modify"].includes(capability)) {
    return { allowed: false, requiresApproval: false, reason: "agent cannot modify its own or security policy" };
  }
  if (rule.deniedCapabilities.includes(capability)) return { allowed: false, requiresApproval: false, reason: "capability explicitly denied by agent policy" };
  if (!rule.allowedCapabilities.includes(capability)) return { allowed: false, requiresApproval: false, reason: "capability is not allowed for this agent" };

  // Publishing is the single Shop exception: the operation may cross the
  // execute boundary only as an explicit approval-gated capability.
  if (agent === "shop" && capability === "store.publish" && mode === "execute") {
    return { allowed: true, requiresApproval: true, reason: "shop publishing requires explicit approval" };
  }

  const modes: AgentAccessMode[] = ["read", "write", "execute"];
  if (modes.indexOf(mode) > modes.indexOf(rule.maxMode)) return { allowed: false, requiresApproval: false, reason: "requested mode exceeds agent policy" };
  return { allowed: true, requiresApproval: capability === "store.publish", reason: "agent policy allows capability" };
}

export function listAgentPolicies(): AgentRule[] {
  return RULES.map((rule) => ({ ...rule, allowedCapabilities: [...rule.allowedCapabilities], deniedCapabilities: [...rule.deniedCapabilities] }));
}
