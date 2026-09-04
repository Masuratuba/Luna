import { createSupabaseServiceClient } from "../supabase/server";

export type MailSendRequest = Readonly<{
  userId: string;
  to: readonly string[];
  subject: string;
  text: string;
  threadId?: string;
}>;

export type MailSendResult = Readonly<{
  providerMessageId: string;
  queued: true;
}>;

export interface MailSendProvider {
  readonly name: string;
  sendMessage(request: MailSendRequest): Promise<MailSendResult>;
}

/** Outbound mail boundary. Transport is deliberately not connected here. */
export class DurableMailSendProvider implements MailSendProvider {
  readonly name = "durable-mail-send";

  async sendMessage(request: MailSendRequest): Promise<MailSendResult> {
    if (!request.userId.trim()) throw new Error("MAIL_SEND_USER_REQUIRED");
    if (request.to.length === 0) throw new Error("MAIL_SEND_RECIPIENT_REQUIRED");
    if (!request.subject.trim()) throw new Error("MAIL_SEND_SUBJECT_REQUIRED");
    if (!request.text.trim()) throw new Error("MAIL_SEND_BODY_REQUIRED");

    const client = createSupabaseServiceClient();
    if (!client) throw new Error("MAIL_SEND_STORE_UNAVAILABLE");

    const { data, error } = await client
      .from("mail_send_queue")
      .insert({
        user_id: request.userId,
        to: request.to,
        subject: request.subject,
        body_text: request.text,
        thread_id: request.threadId ?? null,
        status: "queued",
      })
      .select("id")
      .single();

    if (error || !data) throw new Error(`MAIL_SEND_QUEUE_FAILED:${error?.message ?? "NO_ID"}`);
    return { providerMessageId: String(data.id), queued: true };
  }
}
