import { runSchedulerRuntimeTick, type SchedulerRuntimeOptions, type SchedulerRuntimeResult } from "./scheduler-runtime";

export type SchedulerTriggerOptions = SchedulerRuntimeOptions & {
  triggerId?: string;
};

export type SchedulerTriggerResult = SchedulerRuntimeResult & {
  triggerId: string;
};

/**
 * Single controlled scheduler invocation.
 * The trigger owns no side effects; execution remains inside the existing
 * scheduler runtime and Guardian-gated executor.
 */
export async function runControlledSchedulerTrigger(
  options: SchedulerTriggerOptions,
): Promise<SchedulerTriggerResult> {
  const triggerId = options.triggerId ?? `scheduler-trigger:${options.now ?? new Date().toISOString()}`;
  const result = await runSchedulerRuntimeTick(options);
  return { ...result, triggerId };
}

export function schedulerTriggerTruthRules(): string[] {
  return [
    "One trigger invocation performs at most one scheduler tick; it is not an autonomous side-effect engine.",
    "The trigger never bypasses authorization or the Guardian-gated executor.",
    "A trigger returning success means only that the scheduler runtime completed its invocation; task completion still requires a real executor success.",
    "Persistence uncertainty remains explicit and is never converted into success.",
  ];
}
