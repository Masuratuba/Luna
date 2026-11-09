export type StripeBillingConfig = {
  secretKey: string;
  priceId: string;
  appUrl: string;
};

export function getStripeBillingConfig(): StripeBillingConfig | null {
  if (process.env.STRIPE_BILLING_ENABLED !== "true") return null;
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const priceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID?.trim();
  const appUrl = process.env.LUNA_APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!secretKey || !priceId || !appUrl) return null;
  try {
    const parsed = new URL(appUrl);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") return null;
    return { secretKey, priceId, appUrl: parsed.origin };
  } catch {
    return null;
  }
}

export function isStripeWebhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
}
