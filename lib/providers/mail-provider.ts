import { createSupabaseServiceClient } from "../supabase/server";

export type MailMessage = Readonly<{
  id: string;
  providerMessageId: string;
  threadId?: string;
  from: string;
  to: readonly string[];
  subject: string;
  text: string;
  receivedAt: string;
  unread: boolean;
}>;

export type MailReadRequest = Readonly<{
  userId: string;
  limit?: number;
  unreadOnly?: boolean;
}>;

export interface MailReadProvider {
  readonly name: string;
  listMessages(request: MailReadRequest): Promise<readonly MailMessage[]>;
}

const MAX_LIMIT = 50;

function normalizeLimit(limit?: number): number {
  if (!Number.isFinite(limit)) return 20;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit as number)));
}

function normalizeRow(row: Record<string, unknown>): MailMessage {
  const to = Array.isArray(row.to) ? row.to.filter((value): value is string => typeof value === "string") : [];
  return {
    id: String(row.id),
    providerMessageId: String(row.provider_message_id),
    ...(typeof row.thread_id === "string" ? { threadId: row.thread_id } : {}),
    from: String(row.from_address),
    to,
    subject: String(row.subject),
    text: String(row.body_text),
    receivedAt: String(row.received_at),
    unread: Boolean(row.unread),
  };
}

/** Read-only, durable mail store. Send is intentionally not part of this capability. */
export class DurableMailProvider implements MailReadProvider {
  readonly name = "durable-mail";

  async listMessages(request: MailReadRequest): Promise<readonly MailMessage[]> {
    if (!request.userId.trim()) throw new Error("MAIL_USER_REQUIRED");
    const client = createSupabaseServiceClient();
    if (!client) throw new Error("MAIL_STORE_UNAVAILABLE");

    let query = client
      .from("mail_messages")
      .select("id,provider_message_id,thread_id,from_address,to,subject,body_text,received_at,unread")
      .eq("user_id", request.userId)
      .order("received_at", { ascending: false })
      .limit(normalizeLimit(request.limit));

    if (request.unreadOnly === true) query = query.eq("unread", true);

    const { data, error } = await query;
    if (error) throw new Error(`MAIL_READ_FAILED:${error.message}`);
    return (data ?? []).map((row) => normalizeRow(row as Record<string, unknown>));
  }
}
