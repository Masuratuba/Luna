import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/supabase/auth";
import { getOpenAI } from "../../../../lib/openai";
import { approvalActionKey, createDurableApproval } from "../../../../lib/luna/approval-store";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Draft = { to: string[]; cc: string[]; subject: string; body: string; missing: string[] };

export async function POST(request: Request) {
  try {
    const { user } = await requireUser(request);
    const payload = await request.json() as { request?: unknown };
    const prompt = typeof payload.request === "string" ? payload.request.trim() : "";
    if (!prompt || prompt.length > 8000) return NextResponse.json({ error: "Bitte beschreibe die gewünschte E-Mail." }, { status: 400 });

    const response = await getOpenAI().responses.create({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna",
      store: false,
      instructions: "Erstelle einen E-Mail-Entwurf aus der Nutzeranweisung. Antworte ausschließlich als gültiges JSON mit den Feldern to (Array mit Empfängeradressen), cc (Array), subject (String), body (String), missing (Array mit fehlenden Angaben). Erfinde niemals E-Mail-Adressen oder Fakten. Wenn kein Empfänger eindeutig genannt ist, lasse to leer und trage 'Empfängeradresse' in missing ein. Schreibe den Text in der Sprache der Anweisung.",
      input: `Bitte gib die Antwort als JSON zurück.\n\nNutzeranweisung:\n${prompt}`,
      text: { format: { type: "json_object" } },
    });
    let draft: Draft;
    try { draft = JSON.parse(response.output_text || "{}") as Draft; }
    catch { return NextResponse.json({ error: "Der E-Mail-Entwurf konnte nicht sicher gelesen werden." }, { status: 502 }); }

    const to = Array.isArray(draft.to) ? draft.to.map((v) => String(v).trim()).filter(Boolean) : [];
    const cc = Array.isArray(draft.cc) ? draft.cc.map((v) => String(v).trim()).filter(Boolean) : [];
    const subject = typeof draft.subject === "string" ? draft.subject.trim() : "";
    const body = typeof draft.body === "string" ? draft.body.trim() : "";
    const missing = Array.isArray(draft.missing) ? draft.missing.map((v) => String(v)) : [];
    if (to.some((v) => !EMAIL_RE.test(v)) || cc.some((v) => !EMAIL_RE.test(v))) return NextResponse.json({ error: "Mindestens eine Empfängeradresse ist ungültig. Bitte gib die Adresse ausdrücklich an." }, { status: 400 });
    if (!to.length || !subject || !body || missing.length) return NextResponse.json({ ok: true, needsDetails: true, missing, draft: { to, cc, subject, body } });
    if (subject.length > 500 || body.length > 20000) return NextResponse.json({ error: "Der Entwurf ist zu lang." }, { status: 400 });

    const actionPayload = { to, cc, subject, body };
    const approval = await createDurableApproval(user.id, approvalActionKey("mail.send", actionPayload), "Outlook-E-Mail nach ausdrücklicher Nutzerbestätigung senden");
    return NextResponse.json({ ok: true, draft: actionPayload, approval: { id: approval.id, token: approval.token, expiresAt: approval.expires_at } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Bitte melde dich erneut an." }, { status: 401 });
    console.error("Luna mail draft error", error);
    return NextResponse.json({ error: "E-Mail-Entwurf konnte nicht erstellt werden." }, { status: 500 });
  }
}
