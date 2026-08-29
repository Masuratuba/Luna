import { getLunaAgent, type LunaAgentId } from "./agents";

export type AgentTask = {
  agent: LunaAgentId;
  task: string;
  requiresApproval?: boolean;
};

export type AgentDispatch = AgentTask & {
  approved: boolean;
  reason: string;
};

/** Routes work to specialist agents. Execution remains behind the existing permission/approval layer. */
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
