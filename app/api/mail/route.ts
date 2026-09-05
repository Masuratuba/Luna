import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/supabase/auth";
import { createAction } from "../../../lib/luna/core";
import { ExecutionBudget } from "../../../lib/luna/execution-budget";
import { executeThroughGuardian } from "../../../lib/luna/guardian-gateway";
import { getMicrosoftGraphAccessToken } from "../../../lib/integrations/microsoft";
import { MicrosoftGraphMailProvider } from "../../../lib/providers/mail";

const MAX_QUERY = 500;
const MAX_BODY = 20_000;

function strings(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

export async function POST(request: Request) {
  try {
    const { user, role, trustedAdmin, identity } = await requireUser(request);
    const body = await request.json();
    const operation = typeof body.operation === "string" ? body.operation.trim().toLowerCase() : "";
    const provider = new MicrosoftGraphMailProvider(await getMicrosoftGraphAccessToken(user.id));
    const budget = new ExecutionBudget();

    if (operation === "search") {
      const query = typeof body.query === "string" ? body.query.trim() : "";
      if (!query || query.length > MAX_QUERY) return NextResponse.json({ error: "valid query is required" }, { status: 400 });
      const action = createAction("tool", { tool: "mail.read", operation, query, limit: body.limit, folder: body.folder });
      const result = await executeThroughGuardian({ agent: "research", capability: "mail.read", mode: "read", action, context: { authenticated: true, userId: user.id, role, trustedAdmin, identity, budget, handler: async () => ({ messages: await provider.search({ query, limit: body.limit, folder: body.folder }) }) } });
      if (!result.ok) return NextResponse.json({ ok: false, error: result.error ?? result.guard.reason }, { status: 403 });
      return NextResponse.json({ ok: true, messages: result.execution?.output?.messages ?? [] });
    }

    if (operation === "read") {
      const id = typeof body.id === "string" ? body.id.trim() : "";
      if (!id) return NextResponse.json({ error: "message id is required" }, { status: 400 });
      const action = createAction("tool", { tool: "mail.read", operation, id });
      const result = await executeThroughGuardian({ agent: "research", capability: "mail.read", mode: "read", action, context: { authenticated: true, userId: user.id, role, trustedAdmin, identity, budget, handler: async () => ({ message: await provider.read({ id }) }) } });
      if (!result.ok) return NextResponse.json({ ok: false, error: result.error ?? result.guard.reason }, { status: 403 });
      return NextResponse.json({ ok: true, message: result.execution?.output?.message ?? null });
    }

    if (operation === "send") {
      const to = strings(body.to);
      const cc = strings(body.cc);
      const subject = typeof body.subject === "string" ? body.subject.trim() : "";
      const messageBody = typeof body.body === "string" ? body.body.trim() : "";
      if (!to.length || !subject || !messageBody || messageBody.length > MAX_BODY) return NextResponse.json({ error: "to, subject and body are required" }, { status: 400 });
      if (body.approved !== true || typeof body.confirmationToken !== "string" || !body.confirmationToken.trim()) return NextResponse.json({ ok: false, approvalRequired: true, error: "mail sending requires explicit approval and confirmationToken" }, { status: 403 });
      const action = createAction("tool", { tool: "mail.send", operation, to, cc, subject, body: messageBody });
      const result = await executeThroughGuardian({ agent: "action", capability: "mail.send", mode: "execute", action, context: { authenticated: true, userId: user.id, role, trustedAdmin, identity, approved: true, confirmationToken: body.confirmationToken.trim(), budget, handler: async () => ({ result: await provider.send({ to, cc, subject, body: messageBody }) }) } });
      if (!result.ok) return NextResponse.json({ ok: false, error: result.error ?? result.guard.reason }, { status: 403 });
      return NextResponse.json({ ok: true, sent: true, result: result.execution?.output?.result ?? null });
    }

    return NextResponse.json({ error: "operation must be search, read or send" }, { status: 400 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
      if (error.message === "SUPABASE_NOT_CONFIGURED") return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
      if (error.message === "OWNER_AUTH_INVALID") return NextResponse.json({ error: "owner authentication is invalid" }, { status: 503 });
      if (error.message === "AUTH_IDENTITY_INVALID") return NextResponse.json({ error: "authenticated identity is invalid" }, { status: 503 });
      if (error.message === "MICROSOFT_NOT_CONNECTED") return NextResponse.json({ error: "Microsoft account is not connected" }, { status: 409 });
    }
    console.error("Luna mail error", error);
    return NextResponse.json({ error: "LUNA MAIL API-Fehler" }, { status: 500 });
  }
}
