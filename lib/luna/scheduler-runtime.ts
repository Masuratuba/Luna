import { runSchedulerTick, type SchedulerExecutorOptions, type SchedulerTickResult } from "./scheduler-executor";
import { recoverStaleRunningTasks, retryTask, type SchedulerState } from "./event-scheduler";

export type SchedulerRuntimeOptions = SchedulerExecutorOptions & {
  maxAttempts?: number;
  retryBaseDelayMs?: number;
  retryMaxDelayMs?: number;
  staleAfterMs?: number;
};

export type SchedulerRuntimeResult = SchedulerTickResult & {
  recoveredTaskIds: string[];
  retryScheduled: boolean;
  uncertainExecution?: boolean;
  error?: string;
};

function retryDelayMs(attempt: number, base: number, maximum: number): number {
  const exponent = Math.max(0, attempt - 1);
  return Math.min(maximum, base * 2 ** exponent);
}

function recoveredTaskIds(before: SchedulerState, after: SchedulerState): string[] {
  return after.audit
    .filter((event) => event.type === "task.recovered")
    .filter((event) => !before.audit.some((existing) => existing.taskId === event.taskId && existing.type === event.type && existing.at === event.at))
    .map((event) => event.taskId);
}

export async function runSchedulerRuntimeTick(options: SchedulerRuntimeOptions): Promise<SchedulerRuntimeResult> {
  const now = options.now ?? new Date().toISOString();
  const staleAfterMs = options.staleAfterMs ?? 5 * 60 * 1000;
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const retryBaseDelayMs = Math.max(0, options.retryBaseDelayMs ?? 60 * 1000);
  const retryMaxDelayMs = Math.max(retryBaseDelayMs, options.retryMaxDelayMs ?? 60 * 60 * 1000);

  const loaded = await options.persistence.load();
  const recovered = recoverStaleRunningTasks(loaded, staleAfterMs, now);
  const recoveredIds = recoveredTaskIds(loaded, recovered);

  if (recoveredIds.length > 0) {
    await options.persistence.save(recovered);
  }

  let tick: SchedulerTickResult;
  try {
    tick = await runSchedulerTick({ ...options, now });
  } catch (error) {
    return {
      state: recovered,
      taskId: null,
      executed: false,
      recoveredTaskIds: recoveredIds,
      retryScheduled: false,
      uncertainExecution: true,
      error: error instanceof Error ? error.message : "scheduler persistence failure",
    };
  }

  if (!tick.result || tick.result.ok || !tick.taskId) {
    return { ...tick, recoveredTaskIds: recoveredIds, retryScheduled: false };
  }

  const failedTask = tick.state.tasks.find((task) => task.id === tick.taskId);
  if (!failedTask || failedTask.attempts >= maxAttempts) {
    return { ...tick, recoveredTaskIds: recoveredIds, retryScheduled: false };
  }

  const delay = retryDelayMs(failedTask.attempts, retryBaseDelayMs, retryMaxDelayMs);
  const retried = retryTask(tick.state, failedTask.id, delay, now);
  await options.persistence.save(retried);

  return {
    ...tick,
    state: retried,
    retryScheduled: true,
    recoveredTaskIds: recoveredIds,
  };
}

export function schedulerRuntimeTruthRules(): string[] {
  return [
    "The runtime is a trigger loop around the deterministic scheduler and existing Guardian-gated executor.",
    "A stale running task may be recovered before the next execution attempt; recovery never marks work completed.",
    "Executor failures are retried only up to the configured attempt limit and with bounded exponential backoff.",
    "The stable scheduled task id becomes the stable action idempotency key (`scheduled:<taskId>`); side-effect handlers must honor it to prevent duplicate external effects after recovery.",
    "If persistence fails after execution may have started, the runtime reports an uncertain execution state and never claims success.",
    "This runtime does not itself send messages, write calendars, call external services, or bypass the Guardian Gateway.",
  ];
}
