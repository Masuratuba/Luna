export type LunaAgentId =
  | "luna"
  | "research"
  | "memory"
  | "planner"
  | "action"
  | "security"
  | "document"
  | "coding"
  | "analysis";

export type LunaAgent = {
  id: LunaAgentId;
  name: string;
  description: string;
  capabilities: string[];
  requiresApproval: boolean;
};

export const lunaAgents: readonly LunaAgent[] = [
  { id: "luna", name: "LUNA Core", description: "Master orchestrator and user-facing agent.", capabilities: ["orchestration", "routing", "conversation"], requiresApproval: false },
  { id: "research", name: "Research Agent", description: "Researches, compares, and synthesizes information.", capabilities: ["search", "research", "synthesis"], requiresApproval: false },
  { id: "memory", name: "Memory Agent", description: "Manages durable memory and personal context.", capabilities: ["memory", "recall", "context"], requiresApproval: false },
  { id: "planner", name: "Planner Agent", description: "Turns goals into ordered plans and workflows.", capabilities: ["planning", "scheduling", "workflows"], requiresApproval: false },
  { id: "action", name: "Action Agent", description: "Executes approved tool actions.", capabilities: ["tools", "execution", "queue"], requiresApproval: true },
  { id: "security", name: "Security Agent", description: "Checks permissions, risk, and policy before actions.", capabilities: ["security", "permissions", "risk"], requiresApproval: false },
  { id: "document", name: "Document Agent", description: "Processes and organizes documents and files.", capabilities: ["documents", "files", "extraction"], requiresApproval: false },
  { id: "coding", name: "Coding Agent", description: "Assists with software engineering tasks.", capabilities: ["code", "debugging", "architecture"], requiresApproval: true },
  { id: "analysis", name: "Analysis Agent", description: "Analyzes structured information and agent results.", capabilities: ["analysis", "evaluation", "reporting"], requiresApproval: false },
];

export function getLunaAgents(): LunaAgent[] {
  return lunaAgents.map((agent) => ({ ...agent, capabilities: [...agent.capabilities] }));
}

export function getLunaAgent(id: LunaAgentId): LunaAgent | undefined {
  return lunaAgents.find((agent) => agent.id === id);
}
