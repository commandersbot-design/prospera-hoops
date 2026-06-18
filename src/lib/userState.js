// Per-user key/value store — lets Coach HQ content (watchlists, lineups, notes,
// reads) follow the account across devices instead of living only in the browser.
//
// Backed by one table, `user_state(user_id, key, value jsonb)`, with RLS scoping
// every row to its owner. Everything degrades gracefully: if Supabase is
// unconfigured, the user is signed out, or the table doesn't exist yet, the
// reads return `undefined` and the writes no-op — so callers fall back to their
// localStorage mirror and behave exactly as before.
import { db, getSession, isConfigured } from "./supabaseClient.js";

const enc = encodeURIComponent;

// User id from the session JWT (`sub`), without a network round-trip.
function uid() {
  try {
    const t = getSession()?.access_token;
    if (!t) return null;
    return JSON.parse(atob(t.split(".")[1] || "")).sub || null;
  } catch {
    return null;
  }
}

// Read one key for the signed-in user. `undefined` means "nothing stored / not
// available" (so the caller keeps its local value); any stored value — including
// null, "", [], {} — is returned as-is.
export async function pullState(key) {
  if (!isConfigured || !getSession()) return undefined;
  try {
    const rows = await db.select("user_state", `select=value&key=eq.${enc(key)}&limit=1`);
    return Array.isArray(rows) && rows.length ? rows[0].value : undefined;
  } catch {
    return undefined;
  }
}

// Write one key for the signed-in user. Fire-and-forget; safe to call when
// signed out or before the table exists (it just resolves without doing work).
export async function pushState(key, value) {
  const id = uid();
  if (!isConfigured || !id) return;
  try {
    await db.upsert("user_state", { user_id: id, key, value, updated_at: new Date().toISOString() }, "user_id,key");
  } catch {
    /* table missing / offline — the localStorage mirror still holds it */
  }
}
