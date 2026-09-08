import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/supabase/auth";
import { approvalActionKey, approveDurableApproval, createDurableApproval } from "../../../lib/luna/approval-store";

export async function POST(request: Request) {
  try {
    const { user } = await requireUser(request);
    const body = await request.json() as Record<string, unknown>;

    if (body.operation === "approve") {
      const id = typeof body.id === "string" ? body.id.trim() : "";
      const token = typeof body.token === "string" ? body.token.trim() : "";
      if (!id || !token) return NextResponse.json({ error: "approval id and token are required" }, { status: 400 });
      const approval = await approveDurableApproval(user.id, id, token);
      return NextResponse.json({ ok: true, approval });
    }

    const action = typeof body.action === "string" ? body.action.trim() : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!action || !reason) return NextResponse.json({ error: "action and reason are required" }, { status: 400 });
    const payload = body.payload ?? {};
    const ttlMs = body.ttlMs === undefined ? undefined : Number(body.ttlMs);
    const approval = await createDurableApproval(user.id, approvalActionKey(action, payload), reason, ttlMs);
    return NextResponse.json({ ok: true, approval }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
      if (error.message === "SUPABASE_NOT_CONFIGURED") return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
      if (error.message === "APPROVAL_INVALID" || error.message === "APPROVAL_TTL_INVALID") return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Luna approval error", error);
    return NextResponse.json({ error: "approval failed" }, { status: 500 });
  }
}
