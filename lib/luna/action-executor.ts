import { getToolPermission } from "./permissions";
import type { LunaAction } from "./core";
import { checkGuard, type GuardRequest } from "./guard";
import type { GuardRole } from "./guard";
import type { TrustedAdminContext } from "./trusted-auth";

export type ActionExecutionOutput = Record<string, unknown>;
export type ActionExecutionHandler = (action: LunaAction) => Promise<ActionExecutionOutput>;

export type ActionExecutionContext = {
  authenticated: boolean;
  role?: GuardRole;
  trustedAdmin?: TrustedAdminContext;
  approved?: boolean;
  confirmationToken?: string;
  /** Only the Guardian Gateway may set this to true. */
  gatewayAuthorized?: boolean;
  /** Server-side handler for the already-authorized action. */
  handler?: ActionExecutionHandler;
};

export type ActionExecutionResult = {
  action: LunaAction;
  ok: boolean;
  output?: ActionExecutionOutput;
  error?: string;
  guard?: ReturnType<typeof checkGuard>;
};

export async function executeActionSafely(action: LunaAction, context: ActionExecutionContext): Promise<ActionExecutionResult> {
  if (context.gatewayAuthorized !== true) {
    return { action: { ...action, status: "failed" }, ok: false, error: "guardian gateway authorization required" };
  }

  const guardRequest: GuardRequest = {
    action,
    authenticated: context.authenticated,
    role: context.role,
    trustedAdmin: context.trustedAdmin,
    approved: context.approved,
    confirmationToken: context.confirmationToken,
  };
  const guard = checkGuard(guardRequest);
  if (!guard.allowed) {
    return { action: { ...action, status: "failed" }, ok: false, error: guard.reason, guard };
  }

  const toolName = action.type === "tool" ? String(action.input.tool ?? "") : "";
  const permission = action.type === "tool" ? getToolPermission(toolName) : null;
  if (permission?.requiresConfirmation && context.approved !== true) {
    return { action: { ...action, status: "failed" }, ok: false, error: "explicit confirmation required", guard };
  }

  if (!context.handler) {
    return { action: { ...action, status: "failed" }, ok: false, error: "action handler not configured", guard };
  }

  try {
    const output = await context.handler(action);
    return { action: { ...action, status: "completed" }, ok: true, output, guard };
  } catch (error) {
    return {
      action: { ...action, status: "failed" },
      ok: false,
      error: error instanceof Error ? error.message : "action execution failed",
      guard,
    };
  }
}
