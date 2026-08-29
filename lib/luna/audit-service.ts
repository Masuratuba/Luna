import type { LunaAuditEntry } from "./core";

export type AuditSink = (entry: LunaAuditEntry) => void | Promise<void>;
let sink: AuditSink | null = null;

export function configureAuditSink(next: AuditSink) { sink = next; }
export async function recordAudit(entry: LunaAuditEntry) { if (sink) await sink(entry); }
