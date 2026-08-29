export type LunaWorkflowStep = { id: string; name: string; action: string; dependsOn?: string[] };
export type LunaWorkflow = { id: string; name: string; steps: LunaWorkflowStep[] };

export function validateWorkflow(workflow: LunaWorkflow) {
  const ids = new Set(workflow.steps.map((step) => step.id));
  for (const step of workflow.steps) for (const dep of step.dependsOn ?? []) if (!ids.has(dep)) throw new Error(`Unknown workflow dependency: ${dep}`);
  return workflow;
}
