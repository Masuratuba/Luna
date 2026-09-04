import type { LunaAction } from "./core";
import type { ActionExecutionContext, ActionExecutionHandler, ActionExecutionOutput } from "./action-executor";

export type ToolHandler = (action: LunaAction, context: ActionExecutionContext) => Promise<ActionExecutionOutput>;

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

  const execute: ActionExecutionHandler = async (action, context) => {
    if (action.type !== "tool") throw new Error("TOOL_ACTION_REQUIRED");
    const tool = String(action.input.tool ?? "").trim();
    if (!tool) throw new Error("TOOL_NAME_REQUIRED");

    const handler = resolve(tool);
    if (!handler) throw new Error(`TOOL_HANDLER_NOT_REGISTERED:${tool}`);

    return handler(action, context);
  };

  return { register, has, resolve, execute };
}

export function toolHandlerRegistryTruthRules(): string[] {
  return [
    "Only explicitly registered tools may execute.",
    "An unknown tool fails closed and never falls back to arbitrary execution.",
    "The registry dispatches handlers but does not authorize actions; Guardian authorization remains mandatory in the action executor.",
    "Handlers are server-side capabilities and must not expose secrets or bypass the Guardian Gateway.",
    "Handlers receive the trusted execution context so user-owned data access can be bound to the authenticated subject.",
  ];
}
