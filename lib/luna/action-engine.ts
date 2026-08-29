import { getToolPermission } from "./guard";
import type { LunaAction } from "./core";

export type ActionExecutionResult = {
  action: LunaAction;
  ok: boolean;
  output?: Record<string, unknown>;
  error?: string;
};

export async function executeAction(action: LunaAction): Promise<ActionExecutionResult> {
  const permission = action.type === "tool" ? getToolPermission(String(action.input.tool ?? "")) : null;
  if (permission?.requiresConfirmation) {
    return { action: { ...action, status: "failed" }, ok: false, error: "explicit confirmation required" };
  }
  return { action: { ...action, status: "completed" }, ok: true, output: { executed: false, reason: "provider executor not configured" } };
}
