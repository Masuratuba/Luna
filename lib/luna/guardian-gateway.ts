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

/** Single server-side boundary: Agent -> capability gate -> Guardian -> executor. */
export async function executeThroughGuardian(request: GuardianGatewayRequest): Promise<GuardianGatewayResult> {
  const mode = request.mode ?? "read";
  const access = getAgentAccess(request.agent, request.capability, mode);
  const guardRequest: GuardRequest = {
    action: request.action,
    authenticated: request.context.authenticated,
    role: request.context.role,
    trustedAdmin: request.context.trustedAdmin,
    approved: request.context.approved,
    confirmationToken: request.context.confirmationToken,
  };
  const guard = checkGuard(guardRequest);

  if (!access.allowed) return { ok: false, access, guard, error: access.reason };
  if (access.requiresApproval && request.context.approved !== true) {
    return { ok: false, access, guard, error: "agent capability requires explicit approval" };
  }
  if (!guard.allowed) return { ok: false, access, guard, error: guard.reason };

  const execution = await executeActionSafely(request.action, { ...request.context, gatewayAuthorized: true });
  return { ok: execution.ok, access, guard, execution, error: execution.error };
}
