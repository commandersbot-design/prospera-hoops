// Client billing helpers. Kicks off Stripe Checkout via our serverless endpoint
// and reads the current user's Prospera+ entitlement from Supabase.
import { db, getSession, isConfigured } from "./supabaseClient.js";

// POST to /api/checkout and redirect to Stripe-hosted checkout.
// Returns { ok } on redirect, or { ok:false, reason } so the UI can degrade
// ("unconfigured" → Prospera+ opens at launch).
export async function startCheckout({ plan = "monthly", email, userId, playerId } = {}) {
  try {
    const r = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, email, userId, playerId }),
    });
    if (r.status === 503) return { ok: false, reason: "unconfigured" };
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.url) return { ok: false, reason: data.error || "error", detail: data.detail };
    window.location.assign(data.url);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: "network", detail: String((e && e.message) || e) };
  }
}

// Owner accounts get full access (Prospera+ and Coach tier) regardless of any
// Stripe entitlement. Email is read from the session JWT payload.
const OWNER_EMAILS = ["jalen@prosperahoops.com", "danudastdiab@gmail.com"];
function ownerNow() {
  try {
    const t = getSession()?.access_token; if (!t) return false;
    const email = JSON.parse(atob(t.split(".")[1] || "")).email;
    return OWNER_EMAILS.includes(String(email || "").trim().toLowerCase());
  } catch { return false; }
}

// True when the signed-in user has an active/trialing Prospera+ subscription
// (or is an owner). Reads the `entitlements` table (RLS scopes rows to the owner).
export async function hasPlus() {
  if (!isConfigured || !getSession()) return false;
  if (ownerNow()) return true;
  try {
    const rows = await db.select("entitlements", "select=status&status=in.(active,trialing,past_due)&limit=1");
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

// True when the signed-in user holds an active Coach HQ subscription (plan begins
// with "coach") or is an owner. Pilot-code / admin access is layered on at the call site.
export async function hasCoach() {
  if (!isConfigured || !getSession()) return false;
  if (ownerNow()) return true;
  try {
    const rows = await db.select("entitlements", "select=plan&status=in.(active,trialing,past_due)&plan=like.coach*&limit=1");
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}
