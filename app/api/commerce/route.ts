import { NextResponse } from "next/server";
import { getAgentAccess } from "../../../lib/luna/agent-isolation";
import { requireUser } from "../../../lib/supabase/auth";
import { createProviderRegistry } from "../../../lib/providers/registry";
import { parseCommerceAction, validateCommerceProducts, validatePublishResult } from "../../../lib/providers/commerce-validation";
import { createAction } from "../../../lib/luna/core";
import { ExecutionBudget } from "../../../lib/luna/execution-budget";
import { executeThroughGuardian } from "../../../lib/luna/guardian-gateway";
import { approvalActionKey, consumeDurableApproval } from "../../../lib/luna/approval-store";

export async function POST(request: Request) {
  try {
    const { user, role, trustedAdmin, identity, supabase } = await requireUser(request);
    const rawBody = await request.json() as Record<string, unknown>;
    const action = parseCommerceAction(rawBody);
    const provider = createProviderRegistry().commerce();

    if (action.action === "list") {
      const access = getAgentAccess("shop", "catalog.read", "read");
      if (!access.allowed) return NextResponse.json({ error: "commerce capability denied" }, { status: 403 });
      const products = validateCommerceProducts(await provider.listProducts(action.query));
      return NextResponse.json({ ok: true, action: "list", products, provider: provider.name });
    }

    const access = getAgentAccess("shop", "store.publish", "execute");
    if (!access.allowed || !access.requiresApproval) return NextResponse.json({ error: "commerce publishing denied" }, { status: 403 });
    const approvalId = typeof rawBody.approvalId === "string" ? rawBody.approvalId.trim() : "";
    const confirmationToken = typeof rawBody.confirmationToken === "string" ? rawBody.confirmationToken.trim() : "";
    if (!approvalId || !confirmationToken) return NextResponse.json({ ok: false, approvalRequired: true, error: "commerce publishing requires an approved action token" }, { status: 403 });
    await consumeDurableApproval(supabase, user.id, approvalId, confirmationToken, approvalActionKey("shop.publish", action.product));

    const guardianAction = createAction("tool", {
      tool: "shop.publish",
      productId: action.product.id,
      product: action.product,
    });
    const result = await executeThroughGuardian({
      agent: "shop",
      capability: "store.publish",
      mode: "execute",
      action: guardianAction,
      context: {
        authenticated: true,
        userId: user.id,
        role,
        trustedAdmin,
        identity,
        approved: true,
        confirmationToken,
        budget: new ExecutionBudget(),
        handler: async () => validatePublishResult(await provider.publishProduct(action.product)),
      },
    });

    if (!result.ok) return NextResponse.json({ ok: false, approvalRequired: result.guard.decision === "REQUIRE_APPROVAL", error: result.error ?? result.guard.reason }, { status: 403 });
    const published = result.execution?.output;
    const { error } = await supabase.from("luna_events").insert({
      user_id: user.id,
      event_type: "commerce.publish.completed",
      data: { product_id: action.product.id, provider: provider.name, published },
    });
    if (error) throw error;
    return NextResponse.json({ ok: true, action: "publish", result: published, provider: provider.name });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
      if (error.message === "SUPABASE_NOT_CONFIGURED") return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
      if (error.message === "APPROVAL_INVALID_OR_CONSUMED") return NextResponse.json({ error: "approval is invalid, expired, consumed, or does not match this product" }, { status: 403 });
      if (error.message.startsWith("COMMERCE_")) return NextResponse.json({ error: error.message }, { status: 400 });
      if (error.message === "COMMERCE_PROVIDER_URL is not configured") return NextResponse.json({ error: "commerce provider is not configured" }, { status: 503 });
    }
    console.error("Luna commerce error", error);
    return NextResponse.json({ error: "commerce failed" }, { status: 502 });
  }
}
