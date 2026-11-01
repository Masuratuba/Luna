const PROJECT_STATUSES = new Set(["active", "paused", "completed", "archived"]);
export function validateProjectCreate(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "request body must be an object" };
  const f = body as Record<string, unknown>;
  if (typeof f.name !== "string" || !f.name.trim()) return { error: "name is required" };
  if (f.name.trim().length > 120) return { error: "name must be 120 characters or fewer" };
  if (f.description !== undefined && f.description !== null && typeof f.description !== "string") return { error: "description must be a string or null" };
  if (typeof f.description === "string" && f.description.length > 5000) return { error: "description must be 5000 characters or fewer" };
  if (f.status !== undefined && (typeof f.status !== "string" || !PROJECT_STATUSES.has(f.status))) return { error: "status is invalid" };
  if (f.metadata !== undefined && (!f.metadata || typeof f.metadata !== "object" || Array.isArray(f.metadata))) return { error: "metadata must be an object" };
  return { value: { name: f.name.trim(), description: f.description === undefined ? null : f.description as string | null, status: f.status === undefined ? "active" : f.status as string, metadata: f.metadata === undefined ? {} : f.metadata as Record<string, unknown> } };
}
export function validateProjectUpdate(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "request body must be an object" };
  const f = body as Record<string, unknown>;
  const allowed = new Set(["name", "description", "status", "metadata"]);
  if (Object.keys(f).some(k => !allowed.has(k))) return { error: "request contains unsupported fields" };
  if (!Object.keys(f).length) return { error: "at least one project field is required" };
  if (f.name !== undefined && (typeof f.name !== "string" || !f.name.trim() || f.name.trim().length > 120)) return { error: "name must be a non-empty string of at most 120 characters" };
  if (f.description !== undefined && f.description !== null && typeof f.description !== "string") return { error: "description must be a string or null" };
  if (typeof f.description === "string" && f.description.length > 5000) return { error: "description must be 5000 characters or fewer" };
  if (f.status !== undefined && (typeof f.status !== "string" || !PROJECT_STATUSES.has(f.status))) return { error: "status is invalid" };
  if (f.metadata !== undefined && (!f.metadata || typeof f.metadata !== "object" || Array.isArray(f.metadata))) return { error: "metadata must be an object" };
  return { value: { ...(f.name === undefined ? {} : { name: (f.name as string).trim() }), ...(f.description === undefined ? {} : { description: f.description as string | null }), ...(f.status === undefined ? {} : { status: f.status as string }), ...(f.metadata === undefined ? {} : { metadata: f.metadata as Record<string, unknown> }) } };
}