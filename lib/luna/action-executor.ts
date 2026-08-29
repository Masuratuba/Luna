import { getToolPermission } from "./permissions";
import type { LunaAction } from "./core";
import { checkGuard, type GuardRequest, type GuardRole } from "./guard";

export type ActionExecutionContext = {
  authenticated: boolean;
  role?: GuardRole;
  approved?: boolean;
  confirmationToken?: string;
};

export type ActionExecutionResult = {
  action: LunaAction;
  ok: boolean;
  output?: Record<string, unknown>;
  error?: string;
  guard?: ReturnType<typeof checkGuard>;
};

/**
 * Executes an action only after the independent LUNA Guard authorizes it.
 * The executor never treats an unexecuted action as successful.
 */
export async function executeActionSafely(
  action: LunaAction,
  context: ActionExecutionContext,
): Promise<ActionExecutionResult> {
  const guardRequest: GuardRequest = {
    action,
    authenticated: context.authenticated,
    role: context.role,
    approved: context.approved,
    confirmationToken: context.confirmationToken,
  };
  const guard = checkGuard(guardRequest);

  if (!guard.allowed) {
    return {
      action: { ...action, status: "failed" },
      ok: false,
      error: guard.reason,
      guard,
    };
  }

  const toolName = action.type === "tool" ? String(action.input.tool ?? "") : "";
  const permission = action.type === "tool" ? getToolPermission(toolName) : null;

  if (permission?.requiresConfirmation && context.approved !== true) {
    return {
      action: { ...action, status: "failed" },
      ok: false,
      error: "explicit confirmation required",
      guard,
    };
  }

  if (action.type !== "tool") {
    return {
      action: { ...action, status: "completed" },
      ok: true,
      output: { executed: true, type: action.type },
      guard,
    };
  }

  return {
    action: { ...action, status: "failed" },
    ok: false,
    error: "tool provider not configured",
    guard,
  };
}
