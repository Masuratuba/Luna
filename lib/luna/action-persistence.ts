import type { LunaAction } from "./core";
import { createAuditEntry, createEvent } from "./core";

type ActionResult = { ok: boolean; output?: Record<string, unknown>; error?: string };

type UpdateBuilder = {
  eq(column: string, value: string): UpdateBuilder | Promise<{ error: Error | null }>;
};

type UpdateTable = {
  update(values: Record<string, unknown>): UpdateBuilder;
};

type InsertTable = {
  insert(values: Record<string, unknown>): Promise<{ error: Error | null }>;
};

export type ActionPersistenceClient = {
  from(table: string): unknown;
};

function updateTable(client: ActionPersistenceClient, table: string): UpdateTable {
  return client.from(table) as UpdateTable;
}

function insertTable(client: ActionPersistenceClient, table: string): InsertTable {
  return client.from(table) as InsertTable;
}

export async function persistAction(
  supabase: ActionPersistenceClient,
  userId: string,
  action: LunaAction,
  result: ActionResult,
  risk: string,
) {
  const status = result.ok ? "completed" : "failed";
  const eventType = result.ok ? "action.completed" : "action.failed";
  const update = updateTable(supabase, "luna_actions").update({
    status,
    output: result.output ?? (result.error ? { error: result.error } : null),
    updated_at: new Date().toISOString(),
  });
  const { error: updateError } = await update.eq("id", action.id).eq("user_id", userId);

  if (updateError) throw updateError;

  const event = createEvent(eventType, userId, {
    actionId: action.id,
    type: action.type,
    status,
    error: result.error ?? null,
  });
  const audit = createAuditEntry(event, result.ok ? "success" : "failure");

  const { error: eventError } = await insertTable(supabase, "luna_events").insert({
    user_id: userId,
    event_type: event.type,
    data: event.data,
  });
  if (eventError) throw eventError;

  const { error: auditError } = await insertTable(supabase, "luna_audit_log").insert({
    user_id: userId,
    event_type: audit.type,
    outcome: audit.outcome,
    risk,
    data: audit.data,
  });
  if (auditError) throw auditError;
}
