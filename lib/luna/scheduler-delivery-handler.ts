import type { ActionExecutionHandler } from "./action-executor";

type ServiceClient = {
  from: (table: string) => any;
};

function requiredString(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(`SCHEDULER_${key.toUpperCase()}_REQUIRED`);
  return value.trim();
}

/**
 * Durable server-side delivery for scheduled reminders.
 * This records the reminder in the user's authenticated inbox.
 * It does not claim that a browser/push notification was displayed.
 */
export function createSchedulerDeliveryHandler(supabase: ServiceClient): ActionExecutionHandler {
  return async (action) => {
    if (action.type !== "task") throw new Error("SCHEDULER_TASK_ACTION_REQUIRED");

    const taskId = requiredString(action.input, "scheduledTaskId");
    const userId = requiredString(action.input, "userId");
    const title = requiredString(action.input, "title");
    const kind = requiredString(action.input, "kind");

    const body = kind === "reminder"
      ? `LUNA-Erinnerung: ${title}`
      : `LUNA-Aufgabe: ${title}`;

    const { data: existing, error: lookupError } = await supabase
      .from("scheduler_deliveries")
      .select("id, task_id, user_id, status, recorded_at")
      .eq("task_id", taskId)
      .eq("user_id", userId)
      .maybeSingle();

    if (lookupError) throw new Error(`SCHEDULER_DELIVERY_LOOKUP_FAILED: ${lookupError.message}`);
    if (existing) return { delivery: existing, idempotent: true };

    const { data, error } = await supabase
      .from("scheduler_deliveries")
      .insert({ task_id: taskId, user_id: userId, title, body, status: "recorded" })
      .select("id, task_id, user_id, title, body, status, recorded_at")
      .single();

    if (error) throw new Error(`SCHEDULER_DELIVERY_WRITE_FAILED: ${error.message}`);
    return { delivery: data, idempotent: false };
  };
}
