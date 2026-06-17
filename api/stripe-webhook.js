// Stripe webhook — grants/revokes the Prospera+ entitlement in Supabase.
// Dependency-free: verifies the signature with node:crypto and writes via the
// Supabase REST API using the service-role key (server-only, never shipped to
// the browser).
//
// Required Vercel env vars:
//   STRIPE_SECRET_KEY              sk_...
//   STRIPE_WEBHOOK_SECRET         whsec_...  (from the Stripe dashboard endpoint)
//   SUPABASE_URL                  https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY     service_role JWT (Project Settings → API)
//
// Expects an `entitlements` table (see docs/STRIPE_SETUP.md for the SQL):
//   user_id uuid, email text, plan text, status text,
//   stripe_customer_id text, stripe_subscription_id text PRIMARY KEY,
//   current_period_end timestamptz, updated_at timestamptz
//
// Point a Stripe webhook endpoint at /api/stripe-webhook for events:
//   checkout.session.completed, customer.subscription.updated,
//   customer.subscription.deleted

import crypto from "node:crypto";

export const config = { api: { bodyParser: false } };

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// Stripe-Signature: t=timestamp,v1=hexdigest. Verify v1 == HMAC_SHA256(secret, `${t}.${payload}`).
function verify(raw, header, secret) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=")));
  const expected = crypto.createHmac("sha256", secret).update(`${parts.t}.${raw.toString("utf8")}`, "utf8").digest("hex");
  try {
    return parts.v1 && crypto.timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected));
  } catch { return false; }
}

async function upsertEntitlement(row) {
  const URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL || !KEY) throw new Error("supabase service role not configured");
  const r = await fetch(`${URL}/rest/v1/entitlements?on_conflict=stripe_subscription_id`, {
    method: "POST",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`supabase upsert failed (${r.status}): ${await r.text().catch(() => "")}`);
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) { res.status(503).json({ error: "unconfigured" }); return; }

  const raw = await readRaw(req);
  if (!verify(raw, req.headers["stripe-signature"], secret)) { res.status(400).json({ error: "bad_signature" }); return; }

  let event;
  try { event = JSON.parse(raw.toString("utf8")); } catch { res.status(400).json({ error: "bad_json" }); return; }

  try {
    const o = event.data?.object || {};
    if (event.type === "checkout.session.completed") {
      await upsertEntitlement({
        user_id: o.metadata?.user_id || null,
        email: o.customer_details?.email || o.customer_email || null,
        plan: o.metadata?.plan || "monthly",
        status: "trialing",
        stripe_customer_id: o.customer || null,
        stripe_subscription_id: o.subscription || null,
        updated_at: new Date().toISOString(),
      });
    } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      await upsertEntitlement({
        status: event.type === "customer.subscription.deleted" ? "canceled" : o.status,
        stripe_customer_id: o.customer || null,
        stripe_subscription_id: o.id || null,
        current_period_end: o.current_period_end ? new Date(o.current_period_end * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      });
    }
    res.status(200).json({ received: true });
  } catch (e) {
    res.status(500).json({ error: "handler_error", detail: String((e && e.message) || e) });
  }
}
