// Data layer for the self-serve profile feature: claims + player-editable
// overrides. All calls go through the thin Supabase client; RLS on the server
// is what actually enforces "you can only touch your own data".
import { db, getSession, isConfigured } from "./supabaseClient.js";

const enc = encodeURIComponent;

// The signed-in user's email, decoded from the session JWT (no network call).
function claimantEmail() {
  try {
    const t = getSession()?.access_token;
    if (!t) return null;
    return JSON.parse(atob(t.split(".")[1] || "")).email || null;
  } catch {
    return null;
  }
}

// --- claims -----------------------------------------------------------------

// Submit a claim linking the signed-in user to a player record. We stamp the
// claimant's email into `proof` so the admin can see WHO is claiming and verify
// it before approving.
export async function submitClaim({ player_id, player_name, school, role, proof, message, name }) {
  // "Claimed by" = the claimant's typed name + their account email, so the admin
  // can verify identity at a glance.
  const by = [name && String(name).trim(), claimantEmail()].filter(Boolean).join(" · ");
  const rows = await db.insert("claims", {
    player_id,
    player_name,
    school: school || null,
    role,
    proof: proof || by || null,
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

// Withdraw (un-claim) a claim you submitted. RLS lets a user delete only their
// own claims. Works for both player and team claims.
export async function removeClaim(claimId) {
  return db.del("claims", `id=eq.${enc(claimId)}`);
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

// Admin: pending claims WITH the claimant's email resolved from auth.users (via a
// security-definer function — the client can't read auth.users directly). Falls
// back to the plain query if the function isn't installed yet.
export async function listPendingClaimsAdmin() {
  try {
    const rows = await db.rpc("admin_pending_claims");
    if (Array.isArray(rows)) return rows;
  } catch { /* function not installed yet */ }
  return listClaims("pending");
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

// --- team claims (a coach owns a program) -----------------------------------
// Reuses the claims table with a `team:<slug>` player_id, so team claims share
// the exact same admin-review queue, RLS, and account-linking as player claims.
// `role` is the coach's role on the program (Head Coach / Assistant / …).
export async function submitTeamClaim({ team_slug, team_name, role, proof, message, name }) {
  return submitClaim({ player_id: `team:${team_slug}`, player_name: team_name, school: team_name, role, proof, message, name });
}

// The signed-in user's claim for a specific team, if any.
export async function myClaimForTeam(team_slug) {
  return myClaimForPlayer(`team:${team_slug}`);
}

// Tell a team claim apart from a player claim, and recover its team slug.
export const isTeamClaim = (c) => !!c && typeof c.player_id === "string" && c.player_id.startsWith("team:");
export const teamSlugOf = (c) => (isTeamClaim(c) ? c.player_id.slice(5) : null);

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
// approved claim for player_id. Every save resets `published` to false, so edits
// go back into the admin review queue and never publish without an admin's OK
// (RLS also blocks a client from setting published=true on its own row).
export async function saveOverride(playerId, data) {
  const row = {
    player_id: playerId,
    ...data,
    published: false,
    updated_at: new Date().toISOString(),
  };
  const rows = await db.upsert("profile_overrides", row, "player_id");
  return Array.isArray(rows) ? rows[0] : rows;
}

// --- admin: review player profile edits -------------------------------------

// All unpublished overrides awaiting review (admin RLS returns every row).
export async function listPendingOverrides() {
  return (await db.select("profile_overrides", "select=*&published=eq.false&order=updated_at.desc")) || [];
}

// Admin: publish (approve) a player's edits so they go live.
export async function setOverridePublished(playerId, published) {
  return db.update("profile_overrides", `player_id=eq.${enc(playerId)}`, { published });
}

// Admin: reject a player's edits (clears the overlay row).
export async function rejectOverride(playerId) {
  return db.del("profile_overrides", `player_id=eq.${enc(playerId)}`);
}
