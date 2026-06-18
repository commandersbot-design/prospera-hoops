import { useEffect, useReducer } from "react";
import { pullState, pushState } from "./userState.js";

/**
 * Coach-tier access — gates Scout HQ so it's a paid/coach feature, not something
 * base users can open.
 *
 * Access is granted three ways:
 *   1. Admin (you, the owner) — resolved from Supabase `admins` via useAuth().isAdmin.
 *   2. An approved Coach account/subscription — the real tier, once Supabase + billing
 *      are live (an approved claim with role 'Coach', or a paid plan).
 *   3. A PILOT PASS — redeemed from an access code you hand a pilot coach. This is how
 *      pilots get in before subscriptions exist, without exposing the tier to everyone.
 *
 * The pass is stored per-device in localStorage. Codes live client-side: that's fine for
 * a FREE pilot gate (it protects a feature flag, not money or PII). Real enforcement comes
 * with the subscription backend — see docs/coach-tier.md.
 */
const KEY = "prospera.coachPass.v1";

// Codes you hand out. Normalized to UPPER on redeem. Add a pilot here per program.
// These carry a random suffix so they can't be guessed from the program name —
// rotate any code by editing it here (a redeemed device keeps access until it
// signs out or the localStorage pass is cleared).
const CODES = {
  "PROSPERA-OWNER-CF2E1B": { tier: "owner", label: "Prospera (owner)" },
  "HAYFIELD-FE5D87": { tier: "pilot", team: "Hayfield", label: "Hayfield HS · Pilot" },
  "WARRIORS-3SSB-054F01": { tier: "pilot", team: "Washington Warriors 3SSB", label: "Washington Warriors 3SSB · Pilot" },
  "AKT-FE3A02": { tier: "pilot", team: "AKT", label: "AKT · Pilot" },
};

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || "null"); }
  catch { return null; }
}

let pass = load();
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

export function getCoachPass() { return pass; }

// Redeem an access code → grants the matching pass. Returns the pass, or null if invalid.
export function redeemCoachCode(code) {
  const norm = String(code || "").trim().toUpperCase();
  const hit = CODES[norm];
  if (!hit) return null;
  pass = { ...hit, code: norm };
  try { localStorage.setItem(KEY, JSON.stringify(pass)); } catch { /* private mode */ }
  pushState("coach_pass", pass); // link to the account too, so it follows the coach across devices
  emit();
  return pass;
}

// Recognize a previously-redeemed coach on a fresh login/device: pull the pass
// from their account. If they already have a local pass, push it up instead so
// the account is the source of truth. No-ops when signed out or before the
// user_state table exists (then access stays per-device, as today).
export async function hydrateCoachPass() {
  if (pass) { pushState("coach_pass", pass); return pass; }
  const remote = await pullState("coach_pass");
  if (remote && remote.code) {
    pass = remote;
    try { localStorage.setItem(KEY, JSON.stringify(remote)); } catch { /* private mode */ }
    emit();
  }
  return pass;
}

export function clearCoachPass() {
  pass = null;
  try { localStorage.removeItem(KEY); } catch { /* private mode */ }
  emit();
}

// Subscribe a component to pass changes. Returns { pass, hasPass, redeem, clear }.
// NOTE: admin access is layered on at the call site via useAuth().isAdmin — this
// hook only tracks the redeemable pass.
export function useCoachAccess() {
  const [, force] = useReducer((n) => n + 1, 0);
  useEffect(() => {
    listeners.add(force);
    return () => listeners.delete(force);
  }, []);
  return { pass, hasPass: !!pass, redeem: redeemCoachCode, clear: clearCoachPass };
}
