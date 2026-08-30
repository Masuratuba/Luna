import type { LunaAction } from "./core";
import { executeActionSafely, type ActionExecutionContext, type ActionExecutionResult } from "./action-executor";

/** Compatibility entry point for the action engine. All execution goes through LUNA Guard. */
export async function executeAction(
  action: LunaAction,
  context: ActionExecutionContext = { authenticated: false },
): Promise<ActionExecutionResult> {
  return executeActionSafely(action, context);
}
