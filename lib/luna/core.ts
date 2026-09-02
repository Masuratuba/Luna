import { routeMessage } from "./router";
import { selectAgent, dispatchAgent } from "./agent-orchestrator";
import type { LunaContext, LunaDecision } from "./types";
import type { GuardRisk } from "./guard";

export type LunaAction = {
  id: string;
  type: "task" | "tool" | "memory";
  status: "pending" | "approved" | "completed" | "failed";
  input: Record<string, unknown>;
};

export type LunaEvent = {
  type: "message.received" | "decision.made" | "guard.checked" | "action.created" | "action.completed" | "action.failed";
  userId: string;
  timestamp: string;
  data: Record<string, unknown>;
};

export type LunaAuditEntry = LunaEvent & { outcome: "allowed" | "blocked" | "success" | "failure" };

export function createAction(type: LunaAction["type"], input: Record<string, unknown>): LunaAction {
  return { id: crypto.randomUUID(), type, status: "pending", input };
}

export function createEvent(type: LunaEvent["type"], userId: string, data: Record<string, unknown>): LunaEvent {
  return { type, userId, timestamp: new Date().toISOString(), data };
}

export function createAuditEntry(event: LunaEvent, outcome: LunaAuditEntry["outcome"]): LunaAuditEntry {
  return { ...event, outcome };
}

export function runLunaCore(context: LunaContext) {
  const decision = routeMessage(context.message);
  const agent = selectAgent(context.message, decision);
  const dispatch = dispatchAgent({ agent, task: context.message });
  return { decision, agent, dispatch, context };
}

export function buildGuardEvent(userId: string, decision: LunaDecision, risk: GuardRisk, allowed: boolean) {
  return createAuditEntry(createEvent("guard.checked", userId, { decision, risk }), allowed ? "allowed" : "blocked");
}
