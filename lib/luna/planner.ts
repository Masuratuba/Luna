import type { LunaDecision } from "./types";

export type PlanStep = {
  id: string;
  description: string;
  decision: LunaDecision;
  status: "pending" | "running" | "completed" | "failed";
};

export type LunaPlan = {
  id: string;
  goal: string;
  steps: PlanStep[];
  status: "pending" | "running" | "completed" | "failed";
};

export function createPlan(goal: string, steps: Array<{ description: string; decision: LunaDecision }>): LunaPlan {
  return {
    id: crypto.randomUUID(),
    goal: goal.trim(),
    status: "pending",
    steps: steps.map((step) => ({ id: crypto.randomUUID(), ...step, status: "pending" })),
  };
}

export function nextPlanStep(plan: LunaPlan): PlanStep | null {
  return plan.steps.find((step) => step.status === "pending") ?? null;
}
