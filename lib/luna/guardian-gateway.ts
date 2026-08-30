import type { LunaAgentId } from "./agents";
import { getAgentAccess, type AgentAccessMode } from "./agent-isolation";
import { checkGuard, type GuardRequest, type GuardResult } from "./guard";
import type { LunaAction } from "./core";
import { executeActionSafely, type ActionExecutionContext, type ActionExecutionResult } from "./action-executor";

export type GuardianGatewayRequest = {
  agent: LunaAgentId;
  capability: string;
  mode?: AgentAccessMode;
  action: LunaAction;
  context: ActionExecutionContext;
};

export type GuardianGatewayResult = {
  ok: boolean;
  access: ReturnType<typeof getAgentAccess>;
  guard: GuardResult;
  execution?: ActionExecutionResult;
  error?: string;
};

/**
 * The single server-side boundary for agent actions.
 * Agent -> capability gate -> Guardian -> executor. Agents never call providers directly.
 */
export async function executeThroughGuardian(
  request: GuardianGatewayRequest,
): Promise<GuardianGatewayResult> {
  const mode = request.mode ?? "read";
  const access = getAgentAccess(request.agent, request.capability, mode);

  if (!access.allowed || access.requiresApproval) {
    const guard = checkGuard({
      action: request.action,
      authenticated: request.context.authenticated,
      role: request.context.role,
      approved: request.context.approved,
      confirmationToken: request.context.confirmationToken,
    } satisfies GuardRequest);

    return {
      ok: false,
      access,
      guard,
      error: access.requiresApproval ? "agent capability requires explicit approval" : access.reason,
    };
  }

  const guard = checkGuard({
    action: request.action,
    authenticated: request.context.authenticated,
    role: request.context.role,
    approved: request.context.approved,
    confirmationToken: request.context.confirmationToken,
    adminAuthenticated: request.context.role === "admin" ? false : undefined,
  });

  if (!guard.allowed) return { ok: false, access, guard, error: guard.reason };

  const execution = await executeActionSafely(request.action, request.context);
  return { ok: execution.ok, access, guard, execution, error: execution.error };
}
