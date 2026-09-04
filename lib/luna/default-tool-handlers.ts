import type { ActionExecutionOutput } from "./action-executor";
import type { LunaAction } from "./core";
import { createProviderRegistry } from "../providers/registry";
import { createToolHandlerRegistry, type ToolHandlerRegistry } from "./tool-handler-registry";

function stringInput(action: LunaAction, key: string): string {
  const value = action.input[key];
  return typeof value === "string" ? value.trim() : "";
}

function limitInput(action: LunaAction): number | undefined {
  const value = action.input.limit;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.floor(value);
}

/** Creates the server-side registry of concrete handlers available to Luna. */
export function createDefaultToolHandlerRegistry(): ToolHandlerRegistry {
  const registry = createToolHandlerRegistry();
  const providers = createProviderRegistry();

  registry.register("search", async (action): Promise<ActionExecutionOutput> => {
    const query = stringInput(action, "query");
    if (!query) throw new Error("SEARCH_QUERY_REQUIRED");

    const results = await providers.search().search({ query, limit: limitInput(action) });
    return { query, results };
  });

  return registry;
}
