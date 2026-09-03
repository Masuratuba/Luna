import type { LunaAction } from "./core";
import type { ActionExecutionHandler, ActionExecutionOutput } from "./action-executor";

export type ToolHandler = (action: LunaAction) => Promise<ActionExecutionOutput>;

export type ToolHandlerRegistry = {
  register: (tool: string, handler: ToolHandler) => void;
  has: (tool: string) => boolean;
  resolve: (tool: string) => ToolHandler | undefined;
  execute: ActionExecutionHandler;
};

export function createToolHandlerRegistry(): ToolHandlerRegistry {
  const handlers = new Map<string, ToolHandler>();

  const register = (tool: string, handler: ToolHandler) => {
    const normalized = tool.trim();
    if (!normalized) throw new Error("TOOL_NAME_REQUIRED");
    handlers.set(normalized, handler);
  };

  const has = (tool: string) => handlers.has(tool.trim());
  const resolve = (tool: string) => handlers.get(tool.trim());

  const execute: ActionExecutionHandler = async (action) => {
    if (action.type !== "tool") throw new Error("TOOL_ACTION_REQUIRED");
    const tool = String(action.input.tool ?? "").trim();
    if (!tool) throw new Error("TOOL_NAME_REQUIRED");

    const handler = resolve(tool);
    if (!handler) throw new Error(`TOOL_HANDLER_NOT_REGISTERED:${tool}`);

    return handler(action);
  };

  return { register, has, resolve, execute };
}

export function toolHandlerRegistryTruthRules(): string[] {
  return [
    "Only explicitly registered tools may execute.",
    "An unknown tool fails closed and never falls back to arbitrary execution.",
    "The registry dispatches handlers but does not authorize actions; Guardian authorization remains mandatory in the action executor.",
    "Handlers are server-side capabilities and must not expose secrets or bypass the Guardian Gateway.",
  ];
}
