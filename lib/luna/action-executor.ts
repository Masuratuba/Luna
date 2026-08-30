import { getToolPermission } from "./permissions";
import type { LunaAction } from "./core";
import { checkGuard, type GuardRequest, type GuardRole } from "./guard";

export type ActionExecutionContext = {
  authenticated: boolean;
  role?: GuardRole;
  adminAuthenticated?: boolean;
  approved?: boolean;
  confirmationToken?: string;
  /** Only the Guardian Gateway may set this to true. */
  gatewayAuthorized?: boolean;
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
 * Direct callers are rejected unless the central Guardian Gateway authorized the request.
 */
export async function executeActionSafely(
  action: LunaAction,
  context: ActionExecutionContext,
): Promise<ActionExecutionResult> {
  if (context.gatewayAuthorized !== true) {
    return {
      action: { ...action, status: "failed" },
      ok: false,
      error: "guardian gateway authorization required",
    };
  }

  const guardRequest: GuardRequest = {
    action,
    authenticated: context.authenticated,
    role: context.role,
    adminAuthenticated: context.adminAuthenticated,
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
