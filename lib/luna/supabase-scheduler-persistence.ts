import { createSupabaseServiceClient } from "../supabase/server";
import type { SchedulerPersistence } from "./scheduler-executor";
import type { SchedulerAuditEvent, SchedulerState, ScheduledTask } from "./event-scheduler";

function toTaskRow(task: ScheduledTask) {
  return {
    id: task.id,
    user_id: task.userId,
    title: task.title,
    kind: task.kind,
    status: task.status,
    scheduled_for: task.scheduledFor,
    created_at: task.createdAt,
    started_at: task.startedAt ?? null,
    completed_at: task.completedAt ?? null,
    cancelled_at: task.cancelledAt ?? null,
    failed_at: task.failedAt ?? null,
    recurrence: task.recurrence ?? null,
    attempts: task.attempts,
    requires_authorization: task.requiresAuthorization,
    authorized: task.authorized,
    last_error: task.lastError ?? null,
  };
}

function fromTaskRow(row: Record<string, unknown>): ScheduledTask {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title),
    kind: row.kind as ScheduledTask["kind"],
    status: row.status as ScheduledTask["status"],
    scheduledFor: String(row.scheduled_for),
    createdAt: String(row.created_at),
    startedAt: row.started_at ? String(row.started_at) : undefined,
    completedAt: row.completed_at ? String(row.completed_at) : undefined,
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : undefined,
    failedAt: row.failed_at ? String(row.failed_at) : undefined,
    recurrence: row.recurrence ? String(row.recurrence) : undefined,
    attempts: Number(row.attempts),
    requiresAuthorization: Boolean(row.requires_authorization),
    authorized: Boolean(row.authorized),
    lastError: row.last_error ? String(row.last_error) : undefined,
  };
}

function toAuditRow(event: SchedulerAuditEvent) {
  return {
    task_id: event.taskId,
    type: event.type,
    at: event.at,
    detail: event.detail ?? null,
  };
}

function fromAuditRow(row: Record<string, unknown>): SchedulerAuditEvent {
  return {
    taskId: String(row.task_id),
    type: row.type as SchedulerAuditEvent["type"],
    at: String(row.at),
    detail: row.detail ? String(row.detail) : undefined,
  };
}

function requireServiceClient() {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("SUPABASE_SERVICE_ROLE_NOT_CONFIGURED");
  return supabase;
}

export function createSupabaseSchedulerPersistence(userId: string): SchedulerPersistence {
  if (!userId) throw new Error("SCHEDULER_USER_ID_REQUIRED");

  return {
    async load(): Promise<SchedulerState> {
      const supabase = requireServiceClient();
      const { data: taskRows, error: taskError } = await supabase
        .from("scheduler_tasks")
        .select("*")
        .eq("user_id", userId)
        .order("scheduled_for", { ascending: true });
      if (taskError) throw new Error(`SCHEDULER_LOAD_TASKS_FAILED: ${taskError.message}`);

      const tasks = (taskRows ?? []).map((row) => fromTaskRow(row as Record<string, unknown>));
      const taskIds = tasks.map((task) => task.id);
      if (taskIds.length === 0) return { tasks: [], audit: [] };

      const { data: auditRows, error: auditError } = await supabase
        .from("scheduler_audit_events")
        .select("*")
        .in("task_id", taskIds)
        .order("at", { ascending: true });
      if (auditError) throw new Error(`SCHEDULER_LOAD_AUDIT_FAILED: ${auditError.message}`);

      return {
        tasks,
        audit: (auditRows ?? []).map((row) => fromAuditRow(row as Record<string, unknown>)),
      };
    },

    async save(state: SchedulerState): Promise<void> {
      const supabase = requireServiceClient();
      const foreignTask = state.tasks.find((task) => task.userId !== userId);
      if (foreignTask) throw new Error("SCHEDULER_CROSS_USER_STATE_REJECTED");

      if (state.tasks.length > 0) {
        const { error: taskError } = await supabase
          .from("scheduler_tasks")
          .upsert(state.tasks.map(toTaskRow), { onConflict: "id" });
        if (taskError) throw new Error(`SCHEDULER_SAVE_TASKS_FAILED: ${taskError.message}`);
      }

      if (state.audit.length > 0) {
        const taskIds = new Set(state.tasks.map((task) => task.id));
        const foreignAudit = state.audit.find((event) => !taskIds.has(event.taskId));
        if (foreignAudit) throw new Error("SCHEDULER_CROSS_TASK_AUDIT_REJECTED");

        const { error: auditError } = await supabase
          .from("scheduler_audit_events")
          .upsert(state.audit.map(toAuditRow), { onConflict: "task_id,type,at" });
        if (auditError) throw new Error(`SCHEDULER_SAVE_AUDIT_FAILED: ${auditError.message}`);
      }
    },
  };
}
