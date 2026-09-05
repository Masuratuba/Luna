export type MailFolder = "inbox" | "sent";
export type MailMessage = Readonly<{ id: string; subject: string; from?: string; to: readonly string[]; receivedAt?: string; bodyPreview?: string; isRead?: boolean }>;
export type MailSearchRequest = Readonly<{ query: string; limit?: number; folder?: MailFolder }>;
export type MailReadRequest = Readonly<{ id: string }>;
export type MailSendRequest = Readonly<{ to: readonly string[]; subject: string; body: string; cc?: readonly string[] }>;
export interface MailProvider { readonly name: string; search(request: MailSearchRequest): Promise<readonly MailMessage[]>; read(request: MailReadRequest): Promise<MailMessage>; send(request: MailSendRequest): Promise<{ id: string; sent: boolean }>; }

const GRAPH = "https://graph.microsoft.com/v1.0";
const TIMEOUT_MS = 15_000;
const MAX_LIMIT = 20;
function requiredToken(token?: string) { const value = token?.trim(); if (!value) throw new Error("MICROSOFT_GRAPH_ACCESS_TOKEN is not configured"); return value; }
function normalizeLimit(value?: number) { const n = Number.isFinite(value) ? Math.floor(value as number) : 10; return Math.min(MAX_LIMIT, Math.max(1, n)); }
function escapeGraphSearch(value: string) { return value.replace(/\\/g, "\\\\").replace(/\"/g, '\\"'); }
function asAddress(value: unknown): string | undefined { if (!value || typeof value !== "object") return undefined; const address = "emailAddress" in value ? value.emailAddress : undefined; if (!address || typeof address !== "object") return undefined; const result = "address" in address ? address.address : undefined; return typeof result === "string" ? result : undefined; }
function asMessage(raw: unknown): MailMessage { if (!raw || typeof raw !== "object") throw new Error("MAIL_INVALID_RESPONSE"); const item = raw as Record<string, unknown>; const recipients = Array.isArray(item.toRecipients) ? item.toRecipients.map(asAddress).filter((x): x is string => Boolean(x)) : []; const from = asAddress(item.from); const id = typeof item.id === "string" ? item.id : ""; const subject = typeof item.subject === "string" ? item.subject : ""; if (!id || !subject) throw new Error("MAIL_INVALID_RESPONSE"); return { id, subject, from, to: recipients, receivedAt: typeof item.receivedDateTime === "string" ? item.receivedDateTime : undefined, bodyPreview: typeof item.bodyPreview === "string" ? item.bodyPreview : undefined, isRead: typeof item.isRead === "boolean" ? item.isRead : undefined }; }

export class MicrosoftGraphMailProvider implements MailProvider {
  readonly name = "microsoft-graph-mail";
  constructor(private readonly accessToken = process.env.MICROSOFT_GRAPH_ACCESS_TOKEN) {}
  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = requiredToken(this.accessToken);
    let response: Response;
    try { response = await fetch(`${GRAPH}${path}`, { ...init, headers: { accept: "application/json", authorization: `Bearer ${token}`, ...(init?.headers ?? {}) }, signal: AbortSignal.timeout(TIMEOUT_MS) }); }
    catch (error) { if (error instanceof DOMException && error.name === "TimeoutError") throw new Error("MAIL_PROVIDER_TIMEOUT"); throw error; }
    if (!response.ok) { if (response.status === 401 || response.status === 403) throw new Error("MAIL_PROVIDER_UNAUTHORIZED"); throw new Error(`MAIL_PROVIDER_HTTP_${response.status}`); }
    const contentType = response.headers.get("content-type") ?? "";
    if ((response.status === 202 || response.status === 204) && !contentType) return undefined as T;
    if (!contentType.toLowerCase().includes("application/json")) throw new Error("MAIL_PROVIDER_INVALID_CONTENT_TYPE");
    return response.json() as Promise<T>;
  }
  async search(request: MailSearchRequest): Promise<readonly MailMessage[]> {
    const query = request.query.trim(); if (!query) throw new Error("MAIL_QUERY_REQUIRED");
    const folder = request.folder ?? "inbox"; const params = new URLSearchParams({ "$top": String(normalizeLimit(request.limit)), "$select": "id,subject,from,toRecipients,receivedDateTime,bodyPreview,isRead" }); params.set("$search", `\"${escapeGraphSearch(query)}\"`);
    const data = await this.request<{ value?: unknown[] }>(`/me/mailFolders/${folder}/messages?${params.toString()}`, { headers: { ConsistencyLevel: "eventual" } }); return (data.value ?? []).map(asMessage);
  }
  async read(request: MailReadRequest): Promise<MailMessage> { const id = request.id.trim(); if (!id) throw new Error("MAIL_ID_REQUIRED"); const params = new URLSearchParams({ "$select": "id,subject,from,toRecipients,receivedDateTime,bodyPreview,isRead" }); return asMessage(await this.request<unknown>(`/me/messages/${encodeURIComponent(id)}?${params.toString()}`)); }
  async send(request: MailSendRequest): Promise<{ id: string; sent: boolean }> {
    const to = request.to.map((x) => x.trim()).filter(Boolean); const subject = request.subject.trim(); const body = request.body.trim(); if (!to.length) throw new Error("MAIL_RECIPIENT_REQUIRED"); if (!subject) throw new Error("MAIL_SUBJECT_REQUIRED"); if (!body) throw new Error("MAIL_BODY_REQUIRED");
    await this.request<void>("/me/sendMail", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: { subject, body: { contentType: "Text", content: body }, toRecipients: to.map((address) => ({ emailAddress: { address } })), ...(request.cc?.length ? { ccRecipients: request.cc.map((address) => ({ emailAddress: { address } })) } : {}) }, saveToSentItems: true }) });
    return { id: crypto.randomUUID(), sent: true };
  }
}
