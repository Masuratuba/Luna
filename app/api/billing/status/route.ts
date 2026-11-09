import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/supabase/auth";
import { getStripeBillingConfig, isStripeWebhookConfigured } from "../../../../lib/billing/stripe";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireUser(request);
    const config = getStripeBillingConfig();
    return NextResponse.json({
      provider: "stripe",
      enabled: Boolean(config),
      checkoutReady: Boolean(config),
      webhookConfigured: isStripeWebhookConfigured(),
      mode: config?.secretKey.startsWith("sk_live_") ? "live" : config ? "test" : "not_configured",
      message: config
        ? "Stripe ist konfiguriert. Checkout bleibt bis zur bewussten Freigabe deaktiviert."
        : "Stripe ist vorbereitet, aber noch nicht verbunden. Es werden keine Zahlungen angenommen.",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "authentication required" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED") {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
    }
    console.error("Billing status error", error);
    return NextResponse.json({ error: "could not load billing status" }, { status: 500 });
  }
}
