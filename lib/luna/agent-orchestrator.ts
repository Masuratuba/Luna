import { getLunaAgent, type LunaAgentId } from "./agents";
import type { LunaDecision } from "./types";

export type AgentTask = { agent: LunaAgentId; task: string; requiresApproval?: boolean };
export type AgentDispatch = AgentTask & { approved: boolean; reason: string };

export function dispatchAgent(task: AgentTask): AgentDispatch {
  const agent = getLunaAgent(task.agent);
  if (!agent) return { ...task, approved: false, reason: "Unknown agent" };
  const approvalRequired = task.requiresApproval ?? agent.requiresApproval;
  return { ...task, approved: !approvalRequired, reason: approvalRequired ? "Approval required before execution" : `Dispatched to ${agent.name}` };
}

export function agentForDecision(decision: LunaDecision): LunaAgentId {
  switch (decision) {
    case "USE_MEMORY": case "SAVE_MEMORY": return "memory";
    case "CREATE_TASK": return "planner";
    case "USE_TOOL": return "research";
    case "ASK_CLARIFICATION": case "ANSWER": default: return "luna";
  }
}

export function routeByCapability(capability: string): LunaAgentId[] {
  const agentIds: LunaAgentId[] = ["research", "memory", "planner", "action", "security", "document", "coding", "analysis", "shop"];
  return agentIds.filter((id) => getLunaAgent(id)?.capabilities.includes(capability) ?? false);
}

export function isShopTask(message: string): boolean {
  return /\b(shop|store|produkt|products?|preis|pricing|verkauf|verkaufen|e-?commerce|catalog|katalog)\b/i.test(message);
}

export function agentForTask(message: string): LunaAgentId {
  return isShopTask(message) ? "shop" : "luna";
}

/** Shop routing has priority over generic decision routing. */
export function selectAgent(message: string, decision: LunaDecision): LunaAgentId {
  return isShopTask(message) ? "shop" : agentForDecision(decision);
}
