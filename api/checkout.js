// Stripe Checkout — dependency-free (talks to the Stripe REST API via fetch, the
// same pattern we use for Supabase). Creates a subscription Checkout Session for
// Prospera+ with a 30-day trial and redirects the client to Stripe-hosted checkout.
//
// Required Vercel env vars (Production + Preview):
//   STRIPE_SECRET_KEY            sk_live_... (or sk_test_... while testing)
//   STRIPE_PRICE_PLUS_MONTHLY    price_...  ($5/mo recurring price ID)
//   STRIPE_PRICE_PLUS_YEARLY     price_...  ($39/yr recurring price ID)
// Optional:
//   PUBLIC_BASE_URL             https://www.prosperahoops.com (else derived from the request)
//
// Until STRIPE_SECRET_KEY is set this returns 503 {error:"unconfigured"} and the
// UI degrades to a "Prospera+ opens at launch" state — launch is never blocked.

const PRICES = {
  monthly: () => process.env.STRIPE_PRICE_PLUS_MONTHLY,
  yearly: () => process.env.STRIPE_PRICE_PLUS_YEARLY,
  coach_monthly: () => process.env.STRIPE_PRICE_COACH_MONTHLY,
  coach_yearly: () => process.env.STRIPE_PRICE_COACH_YEARLY,
};

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "method_not_allowed" }); return; }
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) { res.status(503).json({ error: "unconfigured" }); return; }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const plan = PRICES[body.plan] ? body.plan : "monthly";
    const price = PRICES[plan]();
    if (!price) { res.status(503).json({ error: "unconfigured", detail: `missing price for ${plan}` }); return; }
    const isCoach = plan.startsWith("coach");

    const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0];
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const base = (process.env.PUBLIC_BASE_URL || `${proto}://${host}`).replace(/\/$/, "");

    // Stripe wants application/x-www-form-urlencoded with bracketed nested keys.
    const form = new URLSearchParams();
    form.set("mode", "subscription");
    form.set("line_items[0][price]", price);
    form.set("line_items[0][quantity]", "1");
    if (!isCoach) form.set("subscription_data[trial_period_days]", "30"); // Prospera+ trials; Coach HQ bills immediately
    form.set("allow_promotion_codes", "true");
    form.set("success_url", `${base}/dashboard?upgraded=1`);
    form.set("cancel_url", `${base}/plus`);
    if (body.email) form.set("customer_email", String(body.email));
    // Carry who/what this is for so the webhook can grant the entitlement.
    if (body.userId) form.set("metadata[user_id]", String(body.userId));
    if (body.playerId) form.set("metadata[player_id]", String(body.playerId));
    form.set("metadata[plan]", plan);

    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const data = await r.json();
    if (!r.ok) { res.status(502).json({ error: "stripe_error", detail: data?.error?.message || "checkout failed" }); return; }
    res.status(200).json({ url: data.url });
  } catch (e) {
    res.status(500).json({ error: "server_error", detail: String((e && e.message) || e) });
  }
}
