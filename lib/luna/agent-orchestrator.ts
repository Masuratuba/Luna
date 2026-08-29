import { getLunaAgent, type LunaAgentId } from "./agents";
import type { LunaDecision } from "./types";

export type AgentTask = {
  agent: LunaAgentId;
  task: string;
  requiresApproval?: boolean;
};

export type AgentDispatch = AgentTask & {
  approved: boolean;
  reason: string;
};

/** Routes work to specialist agents. Execution remains behind the permission/approval layer. */
export function dispatchAgent(task: AgentTask): AgentDispatch {
  const agent = getLunaAgent(task.agent);
  if (!agent) {
    return { ...task, approved: false, reason: "Unknown agent" };
  }

  const approvalRequired = task.requiresApproval ?? agent.requiresApproval;
  return {
    ...task,
    approved: !approvalRequired,
    reason: approvalRequired ? "Approval required before execution" : `Dispatched to ${agent.name}`,
  };
}

/** Selects the specialist responsible for the core decision. */
export function agentForDecision(decision: LunaDecision): LunaAgentId {
  switch (decision) {
    case "USE_MEMORY":
    case "SAVE_MEMORY":
      return "memory";
    case "CREATE_TASK":
      return "planner";
    case "USE_TOOL":
      return "research";
    case "ASK_CLARIFICATION":
    case "ANSWER":
    default:
      return "luna";
  }
}

export function routeByCapability(capability: string): LunaAgentId[] {
  const agentIds: LunaAgentId[] = [
    "research",
    "memory",
    "planner",
    "action",
    "security",
    "document",
    "coding",
    "analysis",
  ];

  return agentIds.filter((id) => {
    const agent = getLunaAgent(id);
    return agent?.capabilities.includes(capability) ?? false;
  });
}
