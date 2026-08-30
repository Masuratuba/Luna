import { NextResponse } from "next/server";
import { getAgentAccess } from "../../../lib/luna/agent-isolation";
import { requireUser } from "../../../lib/supabase/auth";
import { createProviderRegistry } from "../../../lib/providers/registry";
import { parseCommerceAction, validateCommerceProducts, validatePublishResult } from "../../../lib/providers/commerce-validation";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const action = parseCommerceAction(await request.json());
    if (action.action === "list") {
      const access = getAgentAccess("shop", "catalog.read", "read");
      if (!access.allowed) return NextResponse.json({ error: "commerce capability denied" }, { status: 403 });
      const provider = createProviderRegistry().commerce();
      const products = validateCommerceProducts(await provider.listProducts(action.query));
      return NextResponse.json({ ok: true, action: "list", products, provider: provider.name });
    }
    const access = getAgentAccess("shop", "store.publish", "execute");
    if (!access.allowed || !access.requiresApproval) return NextResponse.json({ error: "commerce publishing denied" }, { status: 403 });
    const provider = createProviderRegistry().commerce();
    const result = validatePublishResult(await provider.publishProduct(action.product));
    const { error } = await supabase.from("luna_events").insert({ user_id: user.id, event_type: "commerce.publish.completed", data: { product_id: action.product.id, provider: provider.name, published: result.published } });
    if (error) console.error("Luna commerce event error", error);
    return NextResponse.json({ ok: true, action: "publish", result, provider: provider.name });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return NextResponse.json({ error: "authentication required" }, { status: 401 });
      if (error.message === "SUPABASE_NOT_CONFIGURED") return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
      if (error.message.startsWith("COMMERCE_")) return NextResponse.json({ error: error.message }, { status: 400 });
      if (error.message === "COMMERCE_PROVIDER_URL is not configured") return NextResponse.json({ error: "commerce provider is not configured" }, { status: 503 });
    }
    console.error("Luna commerce error", error);
    return NextResponse.json({ error: "commerce failed" }, { status: 502 });
  }
}
