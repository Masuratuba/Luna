const TASK_STATUSES = new Set(["todo", "in_progress", "completed", "cancelled"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function isValidDueAt(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && !Number.isNaN(Date.parse(value)));
}

function isValidPriority(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

export function validateTaskFields(body: Record<string, unknown>, partial = false): string | null {
  if (!partial || body.project_id !== undefined) {
    if (body.project_id !== null && body.project_id !== undefined && !isUuid(body.project_id)) return "project_id must be a valid UUID or null";
  }
  if (!partial || body.description !== undefined) {
    if (body.description !== null && body.description !== undefined && typeof body.description !== "string") return "description must be a string or null";
  }
  if (!partial || body.status !== undefined) {
    if (body.status !== undefined && (typeof body.status !== "string" || !TASK_STATUSES.has(body.status))) return "status is invalid";
  }
  if (!partial || body.priority !== undefined) {
    if (body.priority !== undefined && !isValidPriority(body.priority)) return "priority must be an integer between 1 and 5";
  }
  if (!partial || body.due_at !== undefined) {
    if (!isValidDueAt(body.due_at ?? null)) return "due_at must be a valid date-time string or null";
  }
  return null;
}

export function validateTaskTitle(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? null : "title is required";
}
