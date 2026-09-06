import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/supabase/auth";
import { createAction } from "../../../lib/luna/core";
import { ExecutionBudget } from "../../../lib/luna/execution-budget";
import { executeThroughGuardian } from "../../../lib/luna/guardian-gateway";
import { getMicrosoftGraphAccessToken } from "../../../lib/integrations/microsoft";
import { MicrosoftGraphCalendarProvider } from "../../../lib/providers/calendar";

const MAX_TEXT = 500;
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean) : typeof value === "string" ? value.split(",").map((x) => x.trim()).filter(Boolean) : []; }
function text(value: unknown, max = MAX_TEXT): string { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function approved(body: Record<string, unknown>): boolean { return body.approved === true && typeof body.confirmationToken === "string" && Boolean(body.confirmationToken.trim()); }

export async function POST(request: Request) {
  try {
    const { user, role, trustedAdmin, identity } = await requireUser(request);
    const body = await request.json() as Record<string, unknown>;
    const operation = text(body.operation).toLowerCase();
    const provider = new MicrosoftGraphCalendarProvider(await getMicrosoftGraphAccessToken(user.id));
    const budget = new ExecutionBudget();
    const context = { authenticated: true, userId: user.id, role, trustedAdmin, identity, budget };

    if (operation === "list") {
      const startDateTime = text(body.startDateTime, 100); const endDateTime = text(body.endDateTime, 100);
      if (!startDateTime || !endDateTime) return NextResponse.json({ error: "startDateTime and endDateTime are required" }, { status: 400 });
      const action = createAction("tool", { tool: "calendar.read", operation, startDateTime, endDateTime, limit: body.limit });
      const result = await executeThroughGuardian({ agent: "research", capability: "calendar.read", mode: "read", action, context: { ...context, handler: async () => ({ events: await provider.list({ startDateTime, endDateTime, limit: Number(body.limit) }) }) } });
      if (!result.ok) return NextResponse.json({ ok: false, error: result.error ?? result.guard.reason }, { status: 403 });
      return NextResponse.json({ ok: true, events: result.execution?.output?.events ?? [] });
    }

    if (operation === "read") {
      const id = text(body.id, 200); if (!id) return NextResponse.json({ error: "event id is required" }, { status: 400 });
      const action = createAction("tool", { tool: "calendar.read", operation, id });
      const result = await executeThroughGuardian({ agent: "research", capability: "calendar.read", mode: "read", action, context: { ...context, handler: async () => ({ event: await provider.read(id) }) } });
      if (!result.ok) return NextResponse.json({ ok: false, error: result.error ?? result.guard.reason }, { status: 403 });
      return NextResponse.json({ ok: true, event: result.execution?.output?.event ?? null });
    }

    if (!["create", "update", "delete"].includes(operation)) return NextResponse.json({ error: "operation must be list, read, create, update or delete" }, { status: 400 });
    if (!approved(body)) return NextResponse.json({ ok: false, approvalRequired: true, error: "calendar changes require explicit approval and confirmationToken" }, { status: 403 });

    if (operation === "create") {
      const subject = text(body.subject); const start = text(body.start, 100); const end = text(body.end, 100); if (!subject || !start || !end) return NextResponse.json({ error: "subject, start and end are required" }, { status: 400 });
      const action = createAction("tool", { tool: "calendar.write", operation, subject, start, end });
      const result = await executeThroughGuardian({ agent: "action", capability: "calendar.write", mode: "execute", action, context: { ...context, approved: true, confirmationToken: text(body.confirmationToken, 500), handler: async () => ({ event: await provider.create({ subject, start, end, timeZone: text(body.timeZone, 100) || "UTC", location: text(body.location), body: text(body.body, 20_000), attendees: strings(body.attendees) }) }) } });
      if (!result.ok) return NextResponse.json({ ok: false, error: result.error ?? result.guard.reason }, { status: 403 });
      return NextResponse.json({ ok: true, event: result.execution?.output?.event ?? null });
    }

    if (operation === "update") {
      const id = text(body.id, 200); if (!id) return NextResponse.json({ error: "event id is required" }, { status: 400 });
      const action = createAction("tool", { tool: "calendar.write", operation, id });
      const result = await executeThroughGuardian({ agent: "action", capability: "calendar.write", mode: "execute", action, context: { ...context, approved: true, confirmationToken: text(body.confirmationToken, 500), handler: async () => ({ event: await provider.update({ id, subject: body.subject === undefined ? undefined : text(body.subject), start: body.start === undefined ? undefined : text(body.start, 100), end: body.end === undefined ? undefined : text(body.end, 100), timeZone: text(body.timeZone, 100) || "UTC", location: body.location === undefined ? undefined : text(body.location), body: body.body === undefined ? undefined : text(body.body, 20_000), attendees: body.attendees === undefined ? undefined : strings(body.attendees) }) }) } });
      if (!result.ok) return NextResponse.json({ ok: false, error: result.error ?? result.guard.reason }, { status: 403 });
      return NextResponse.json({ ok: true, event: result.execution?.output?.event ?? null });
    }

    const id = text(body.id, 200); if (!id) return NextResponse.json({ error: "event id is required" }, { status: 400 });
    const action = createAction("tool", { tool: "calendar.write", operation, id });
    const result = await executeThroughGuardian({ agent: "action", capability: "calendar.write", mode: "execute", action, context: { ...context, approved: true, confirmationToken: text(body.confirmationToken, 500), handler: async () => ({ result: await provider.delete(id) }) } });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error ?? result.guard.reason }, { status: 403 });
    return NextResponse.json({ ok: true, result: result.execution?.output?.result ?? null });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
      if (error.message === "SUPABASE_NOT_CONFIGURED") return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
      if (error.message === "MICROSOFT_NOT_CONNECTED") return NextResponse.json({ error: "Microsoft account is not connected" }, { status: 409 });
      if (error.message === "CALENDAR_PROVIDER_UNAUTHORIZED") return NextResponse.json({ error: "Microsoft calendar permission is missing or expired" }, { status: 403 });
    }
    console.error("Luna calendar error", error);
    return NextResponse.json({ error: "LUNA CALENDAR API-Fehler" }, { status: 500 });
  }
}
