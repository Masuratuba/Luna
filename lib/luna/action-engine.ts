import { getToolPermission } from "./permissions";
import type { LunaAction } from "./core";

export type ActionExecutionResult = {
  action: LunaAction;
  ok: boolean;
  output?: Record<string, unknown>;
  error?: string;
};

/** Compatibility entry point for the action engine. */
export async function executeAction(action: LunaAction): Promise<ActionExecutionResult> {
  const toolName = action.type === "tool" ? String(action.input.tool ?? "") : "";
  const permission = action.type === "tool" ? getToolPermission(toolName) : null;

  if (permission?.requiresConfirmation) {
    return { action: { ...action, status: "failed" }, ok: false, error: "explicit confirmation required" };
  }

  if (action.type !== "tool") {
    return {
      action: { ...action, status: "completed" },
      ok: true,
      output: { executed: true, type: action.type },
    };
  }

  return {
    action: { ...action, status: "failed" },
    ok: false,
    error: "tool provider not configured",
  };
}
