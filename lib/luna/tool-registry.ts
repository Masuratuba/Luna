export type LunaTool = {
  name: string;
  description: string;
  enabled: boolean;
};

const tools: LunaTool[] = [];

export function registerTool(tool: LunaTool) {
  if (tools.some((item) => item.name === tool.name)) {
    throw new Error(`Tool already registered: ${tool.name}`);
  }
  tools.push(tool);
}

export function getTools() {
  return [...tools];
}
