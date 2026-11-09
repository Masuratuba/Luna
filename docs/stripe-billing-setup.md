# Luna Stripe billing foundation

Luna uses Stripe-hosted Checkout for subscriptions. No Stripe SDK or credentials are required to build the application. The server talks to Stripe's API directly and never exposes the secret key to browser code.

## Current safety state

- Billing is off unless `STRIPE_BILLING_ENABLED=true`.
- Checkout requires an authenticated Luna user and an explicit `{ "confirm": true }` request body.
- The price ID, secret key, and canonical app URL are server-only environment variables.
- Webhooks are signature-checked with a five-minute timestamp tolerance.
- Verified webhooks are acknowledged but do not grant access, ship products, or mutate financial records yet.
- No real payment can be made until the owner configures credentials, a Stripe Price, and explicitly enables billing.

## Environment variables

Configure these in Vercel only after creating a Stripe account. Start with Stripe **test mode** keys:

- `STRIPE_BILLING_ENABLED=false` (keep false during setup)
- `STRIPE_SECRET_KEY=sk_test_...`
- `STRIPE_SUBSCRIPTION_PRICE_ID=price_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`
- `LUNA_APP_URL=https://your-production-domain`

Never use a `NEXT_PUBLIC_` prefix for secret keys. Never commit credentials.

## Routes

- `GET /api/billing/status` — authenticated readiness status; never returns credentials.
- `POST /api/billing/checkout` — authenticated; requires explicit confirmation; creates a subscription Checkout Session only when all required settings are present and billing is enabled.
- `POST /api/billing/webhook` — verifies Stripe's signature; currently acknowledges events without fulfillment.

## Before enabling checkout

1. Decide the actual Luna plan name, price, billing interval, currency, trial/refund policy, and what subscription unlocks.
2. Create the corresponding Product and recurring Price in Stripe test mode.
3. Add the test-mode secrets and webhook signing secret to Vercel Preview first.
4. Point the Stripe test webhook to `/api/billing/webhook`.
5. Add idempotent event persistence and entitlement handling before any production use.
6. Test checkout, successful payment, cancellation, failed payment, duplicate webhook delivery, and subscription cancellation.
7. Only then consider production credentials and an explicit owner-approved enablement.

## Why Checkout

Stripe-hosted Checkout is used instead of handling card data inside Luna. Stripe recommends Checkout Sessions for on-session payments and subscriptions. Fulfillment should be driven by verified webhook events, not only by the browser redirect.
