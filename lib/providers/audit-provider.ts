import { createSupabaseServiceClient } from "../supabase/server";

export type AuditEvent = Readonly<{
  userId: string;
  action: string;
  outcome: "queued" | "failed";
  resourceId?: string;
  error?: string;
}>;

export interface AuditProvider {
  record(event: AuditEvent): Promise<void>;
}

/** Durable audit boundary for security-sensitive actions. */
export class DurableAuditProvider implements AuditProvider {
  async record(event: AuditEvent): Promise<void> {
    if (!event.userId.trim()) throw new Error("AUDIT_USER_REQUIRED");
    if (!event.action.trim()) throw new Error("AUDIT_ACTION_REQUIRED");

    const client = createSupabaseServiceClient();
    if (!client) throw new Error("AUDIT_STORE_UNAVAILABLE");

    const { error } = await client.from("audit_events").insert({
      user_id: event.userId,
      action: event.action,
      outcome: event.outcome,
      resource_id: event.resourceId ?? null,
      error_message: event.error ?? null,
    });

    if (error) throw new Error(`AUDIT_RECORD_FAILED:${error.message}`);
  }
}
