// Data layer for the self-serve profile feature: claims + player-editable
// overrides. All calls go through the thin Supabase client; RLS on the server
// is what actually enforces "you can only touch your own data".
import { db, getSession, isConfigured } from "./supabaseClient.js";

const enc = encodeURIComponent;

// --- claims -----------------------------------------------------------------

// Submit a claim linking the signed-in user to a player record.
export async function submitClaim({ player_id, player_name, school, role, proof, message }) {
  const rows = await db.insert("claims", {
    player_id,
    player_name,
    school: school || null,
    role,
    proof: proof || null,
    message: message || null,
    status: "pending",
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

// All claims the signed-in user has made (RLS scopes this to them).
export async function myClaims() {
  if (!getSession()) return [];
  return (await db.select("claims", "select=*&order=created_at.desc")) || [];
}

// The signed-in user's claim for a specific player, if any.
export async function myClaimForPlayer(playerId) {
  if (!getSession()) return null;
  const rows = await db.select("claims", `select=*&player_id=eq.${enc(playerId)}&limit=1`);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

// Admin: all pending claims awaiting review.
export async function listClaims(status = "pending") {
  const q = status ? `select=*&status=eq.${enc(status)}&order=created_at.desc` : "select=*&order=created_at.desc";
  return (await db.select("claims", q)) || [];
}

// Admin: approve / reject. Approving a claim is what unlocks self-edit (an RLS
// policy on profile_overrides checks for an approved claim).
export async function setClaimStatus(claimId, status) {
  const rows = await db.update("claims", `id=eq.${enc(claimId)}`, {
    status,
    reviewed_at: new Date().toISOString(),
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

// --- overrides (the only player-editable data) ------------------------------

// Public read: the contact-masked overlay view. Readable by anyone, so the
// public profile can show it; private contact is nulled by the view server-side.
export async function getOverride(playerId) {
  if (!isConfigured) return null;
  try {
    const rows = await db.select("public_profiles", `select=*&player_id=eq.${enc(playerId)}&limit=1`);
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  } catch {
    return null;
  }
}

// Owner read: the full base row (incl. private contact) for prefilling the
// editor. RLS only returns it to a user with an approved claim for this player.
export async function getMyOverride(playerId) {
  if (!isConfigured || !getSession()) return null;
  try {
    const rows = await db.select("profile_overrides", `select=*&player_id=eq.${enc(playerId)}&limit=1`);
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  } catch {
    return null;
  }
}

// Owner write: upsert the overlay. RLS only permits this when the user has an
// approved claim for player_id, so a hostile client cannot edit someone else.
export async function saveOverride(playerId, data) {
  const row = {
    player_id: playerId,
    ...data,
    updated_at: new Date().toISOString(),
  };
  const rows = await db.upsert("profile_overrides", row, "player_id");
  return Array.isArray(rows) ? rows[0] : rows;
}
