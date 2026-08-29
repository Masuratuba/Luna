export type LunaTool = {
  name: string;
  description: string;
  enabled: boolean;
  permission: "read" | "write" | "destructive";
  requiresConfirmation: boolean;
};

const tools: LunaTool[] = [];

export function registerTool(tool: LunaTool) {
  if (tools.some((item) => item.name === tool.name)) throw new Error(`Tool already registered: ${tool.name}`);
  tools.push(tool);
}

export function getTools() { return [...tools]; }

export function getRegisteredTool(name: string) { return tools.find((tool) => tool.name === name); }
