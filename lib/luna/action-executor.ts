import type { LunaAction } from "./core";
import { evaluateActionPolicy } from "./action-policy";
import { checkGuard, type GuardRequest } from "./guard";
import type { GuardRole } from "./guard";
import type { TrustedAdminContext, TrustedUserContext } from "./trusted-auth";
import { hasTrustedScope, isTrustedIdentityForSubject } from "./trusted-auth";

export type ActionExecutionOutput = Record<string, unknown>;
export type ActionExecutionHandler = (action: LunaAction) => Promise<ActionExecutionOutput>;

export type ActionExecutionContext = {
  /** Legacy flag retained for API compatibility; trusted identity is now mandatory. */
  authenticated: boolean;
  /** Canonical authenticated subject. Must match identity.subject. */
  userId: string;
  role?: GuardRole;
  trustedAdmin?: TrustedAdminContext;
  identity?: TrustedUserContext;
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

function requiredScope(action: LunaAction): string | null {
  if (action.type === "tool") {
    const tool = String(action.input.tool ?? "").trim();
    if (tool === "search") return "search:read";
    if (tool === "memory.read") return "memory:read";
    if (tool === "memory.write") return "memory:write";
    if (tool === "task.create") return "task:create";
    return `${tool}:execute`;
  }
  if (action.type === "memory") return "memory:write";
  if (action.type === "task") return "task:create";
  return null;
}

export async function executeActionSafely(action: LunaAction, context: ActionExecutionContext): Promise<ActionExecutionResult> {
  if (context.gatewayAuthorized !== true) {
    return { action: { ...action, status: "failed" }, ok: false, error: "guardian gateway authorization required" };
  }

  if (!context.authenticated || !context.identity || !isTrustedIdentityForSubject(context.identity, context.userId)) {
    return { action: { ...action, status: "failed" }, ok: false, error: "trusted identity required" };
  }

  if (context.trustedAdmin && context.trustedAdmin.subject !== context.identity.subject) {
    return { action: { ...action, status: "failed" }, ok: false, error: "trusted identity mismatch" };
  }

  const scope = requiredScope(action);
  if (scope && !hasTrustedScope(context.identity, scope)) {
    return { action: { ...action, status: "failed" }, ok: false, error: `identity scope required: ${scope}` };
  }

  const guardRequest: GuardRequest = {
    action,
    authenticated: true,
    role: context.identity.role,
    trustedAdmin: context.trustedAdmin,
    approved: context.approved,
    confirmationToken: context.confirmationToken,
  };
  const guard = checkGuard(guardRequest);
  if (!guard.allowed) {
    return { action: { ...action, status: "failed" }, ok: false, error: guard.reason, guard };
  }

  const policy = evaluateActionPolicy(action, { authenticated: true, approved: context.approved });
  if (!policy.allowed) {
    return { action: { ...action, status: "failed" }, ok: false, error: policy.reason, guard };
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
