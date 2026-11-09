import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/supabase/auth";
import { getStripeBillingConfig } from "../../../../lib/billing/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { user } = await requireUser(request);
    const config = getStripeBillingConfig();
    if (!config) {
      return NextResponse.json({
        error: "Stripe Checkout is not enabled. Configure test credentials and explicitly enable billing first.",
        code: "BILLING_NOT_CONFIGURED",
      }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    if (body?.confirm !== true) {
      return NextResponse.json({ error: "Explicit checkout confirmation is required." }, { status: 400 });
    }

    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("line_items[0][price]", config.priceId);
    params.set("line_items[0][quantity]", "1");
    params.set("client_reference_id", user.id);
    params.set("metadata[luna_user_id]", user.id);
    params.set("subscription_data[metadata][luna_user_id]", user.id);
    params.set("success_url", `${config.appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", `${config.appUrl}/billing/cancelled`);

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      cache: "no-store",
    });
    const session = await response.json();
    if (!response.ok || typeof session.url !== "string") {
      console.error("Stripe Checkout session creation failed", { status: response.status, type: session?.error?.type });
      return NextResponse.json({ error: "Stripe could not create a Checkout session." }, { status: 502 });
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "authentication required" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "SUPABASE_NOT_CONFIGURED") {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
    }
    console.error("Billing checkout error", error);
    return NextResponse.json({ error: "could not start checkout" }, { status: 500 });
  }
}
