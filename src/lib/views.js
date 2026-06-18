// "Scouts viewed you" — records when a coach-tier (scout) account opens a
// player's profile, and reads the aggregate count for the profile card.
// Degrades to no-op / 0 when Supabase or the table isn't set up yet.
import { db, getSession, isConfigured } from "./supabaseClient.js";

const enc = encodeURIComponent;

// Record a scout view. Only call this for coach/scout-tier viewers.
export async function recordScoutView(playerId) {
  if (!isConfigured || !getSession() || !playerId) return;
  try { await db.insert("profile_views", { player_id: playerId }); } catch { /* table may not exist yet */ }
}

// How many distinct scouts have viewed this player (public aggregate).
export async function scoutViews(playerId) {
  if (!isConfigured || !playerId) return { scouts: 0, last: null };
  try {
    const rows = await db.select("profile_scout_counts", `select=scouts,last_viewed&player_id=eq.${enc(playerId)}&limit=1`);
    if (Array.isArray(rows) && rows.length) return { scouts: rows[0].scouts || 0, last: rows[0].last_viewed || null };
    return { scouts: 0, last: null };
  } catch {
    return { scouts: 0, last: null };
  }
}
