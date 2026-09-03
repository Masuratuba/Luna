import type { LunaAction } from "./core";
import { executeActionSafely, type ActionExecutionContext, type ActionExecutionHandler } from "./action-executor";
import {
  applyExecutionResult,
  markTaskRunning,
  selectDueTask,
  type SchedulerState,
  type ExecutionResult,
} from "./event-scheduler";

export type SchedulerPersistence = {
  load: () => Promise<SchedulerState>;
  save: (state: SchedulerState) => Promise<void>;
};

export type SchedulerExecutorOptions = {
  persistence: SchedulerPersistence;
  handler: ActionExecutionHandler;
  executionContext: Omit<ActionExecutionContext, "handler">;
  now?: string;
};

export type SchedulerTickResult = {
  state: SchedulerState;
  taskId: string | null;
  executed: boolean;
  result?: ExecutionResult;
};

function taskToAction(task: NonNullable<ReturnType<typeof selectDueTask>>): LunaAction {
  return {
    id: `scheduled:${task.id}`,
    type: "task",
    status: "approved",
    input: {
      scheduledTaskId: task.id,
      userId: task.userId,
      title: task.title,
      kind: task.kind,
      scheduledFor: task.scheduledFor,
      recurrence: task.recurrence,
    },
  };
}

export async function runSchedulerTick(options: SchedulerExecutorOptions): Promise<SchedulerTickResult> {
  const now = options.now ?? new Date().toISOString();
  const loaded = await options.persistence.load();
  const due = selectDueTask(loaded, now);

  if (!due) return { state: loaded, taskId: null, executed: false };

  const running = markTaskRunning(loaded, due.id, now);
  await options.persistence.save(running);

  const action = taskToAction(due);
  const result = await executeActionSafely(action, {
    ...options.executionContext,
    handler: options.handler,
    approved: due.requiresAuthorization ? due.authorized : options.executionContext.approved,
  });

  const executionResult: ExecutionResult = result.ok
    ? { ok: true, at: new Date().toISOString() }
    : { ok: false, at: new Date().toISOString(), error: result.error ?? "scheduled task execution failed" };

  const completed = applyExecutionResult(running, due.id, executionResult);
  await options.persistence.save(completed);

  return { state: completed, taskId: due.id, executed: true, result: executionResult };
}

export function schedulerExecutorTruthRules(): string[] {
  return [
    "Only a due, authorized scheduled task may enter execution.",
    "The scheduler persists the running state before invoking the executor.",
    "Only the real action executor result may produce completed or failed.",
    "Executor and persistence failures must never be reported as successful work.",
    "This adapter does not itself send messages, write calendars, or call external services; those remain handler responsibilities behind the existing Guardian Gateway.",
  ];
}
