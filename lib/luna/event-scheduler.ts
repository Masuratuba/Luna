export type ScheduledTaskStatus = "scheduled" | "running" | "completed" | "cancelled" | "failed";

export type ScheduledTask = {
  id: string;
  userId: string;
  title: string;
  kind: "reminder" | "recurring" | "follow_up";
  status: ScheduledTaskStatus;
  scheduledFor: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  failedAt?: string;
  recurrence?: string;
  attempts: number;
  requiresAuthorization: boolean;
  authorized: boolean;
  lastError?: string;
};

export type SchedulerAuditEvent = {
  taskId: string;
  type:
    | "task.scheduled"
    | "task.started"
    | "task.completed"
    | "task.cancelled"
    | "task.failed";
  at: string;
  detail?: string;
};

export type ScheduleRequest = {
  id: string;
  userId: string;
  title: string;
  kind: ScheduledTask["kind"];
  scheduledFor: string;
  recurrence?: string;
  requiresAuthorization?: boolean;
  authorized?: boolean;
};

export type ExecutionResult =
  | { ok: true; at: string }
  | { ok: false; at: string; error: string };

export type SchedulerState = {
  tasks: ScheduledTask[];
  audit: SchedulerAuditEvent[];
};

function cloneTask(task: ScheduledTask): ScheduledTask {
  return { ...task };
}

export function scheduleTask(
  state: SchedulerState,
  request: ScheduleRequest,
  now = new Date().toISOString(),
): SchedulerState {
  if (request.requiresAuthorization && request.authorized !== true) {
    return {
      tasks: [...state.tasks],
      audit: [...state.audit],
    };
  }

  const task: ScheduledTask = {
    id: request.id,
    userId: request.userId,
    title: request.title,
    kind: request.kind,
    status: "scheduled",
    scheduledFor: request.scheduledFor,
    createdAt: now,
    recurrence: request.recurrence,
    attempts: 0,
    requiresAuthorization: request.requiresAuthorization ?? true,
    authorized: request.authorized === true,
  };

  return {
    tasks: [...state.tasks, task],
    audit: [...state.audit, { taskId: task.id, type: "task.scheduled", at: now }],
  };
}

export function selectDueTask(
  state: SchedulerState,
  now = new Date().toISOString(),
): ScheduledTask | null {
  const due = state.tasks
    .filter((task) => task.status === "scheduled")
    .filter((task) => task.scheduledFor <= now)
    .filter((task) => !task.requiresAuthorization || task.authorized)
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));

  return due[0] ? cloneTask(due[0]) : null;
}

export function markTaskRunning(
  state: SchedulerState,
  taskId: string,
  now = new Date().toISOString(),
): SchedulerState {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task || task.status !== "scheduled") return state;

  const updated = { ...task, status: "running" as const, startedAt: now, attempts: task.attempts + 1 };
  return {
    tasks: state.tasks.map((candidate) => (candidate.id === taskId ? updated : candidate)),
    audit: [...state.audit, { taskId, type: "task.started", at: now }],
  };
}

export function applyExecutionResult(
  state: SchedulerState,
  taskId: string,
  result: ExecutionResult,
): SchedulerState {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task || task.status !== "running") return state;

  if (result.ok) {
    const updated = { ...task, status: "completed" as const, completedAt: result.at, lastError: undefined };
    return {
      tasks: state.tasks.map((candidate) => (candidate.id === taskId ? updated : candidate)),
      audit: [...state.audit, { taskId, type: "task.completed", at: result.at }],
    };
  }

  const updated = { ...task, status: "failed" as const, failedAt: result.at, lastError: result.error };
  return {
    tasks: state.tasks.map((candidate) => (candidate.id === taskId ? updated : candidate)),
    audit: [...state.audit, { taskId, type: "task.failed", at: result.at, detail: result.error }],
  };
}

export function cancelTask(
  state: SchedulerState,
  taskId: string,
  now = new Date().toISOString(),
): SchedulerState {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task || task.status === "completed" || task.status === "cancelled") return state;

  const updated = { ...task, status: "cancelled" as const, cancelledAt: now };
  return {
    tasks: state.tasks.map((candidate) => (candidate.id === taskId ? updated : candidate)),
    audit: [...state.audit, { taskId, type: "task.cancelled", at: now }],
  };
}

export function schedulerTruthRules(): string[] {
  return [
    "Scheduling a task does not mean the task has executed.",
    "A task may enter running only after a scheduler selects it as due and an executor starts it.",
    "A task is completed only when the real executor reports success.",
    "Executor failure produces a failed task and an audit event; Luna must not claim success.",
    "Cancellation prevents a scheduled task from being selected, and completed work cannot be rewritten as cancelled.",
    "Authorization is fail-closed: protected tasks are not scheduled or executed without explicit authorization.",
    "This core does not send messages, call external services, write calendars, or persist state by itself.",
  ];
}
