// Data layer for user-submitted film. Every submission lands as `pending` and
// is invisible on the public profile until an admin approves it. Free accounts
// get ONE upload; more requires Prospera+. RLS on the server enforces that a
// user can only see/insert their own rows, and that only admins can approve.
import { db, getSession, isConfigured } from "./supabaseClient.js";

const enc = encodeURIComponent;

// Submit a film link (YouTube/Hudl/etc.) for a player → pending review.
export async function submitFilm({ player_id, player_name, url, title }) {
  const rows = await db.insert("film_submissions", {
    player_id,
    player_name: player_name || null,
    url,
    title: title || null,
    status: "pending",
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

// Every submission the signed-in user has made (RLS scopes this to them).
export async function myFilms() {
  if (!getSession()) return [];
  return (await db.select("film_submissions", "select=*&order=created_at.desc")) || [];
}

// Public read: APPROVED film for a player, from a view that only exposes
// approved rows. Readable by anyone so the public profile can show it.
export async function approvedFilm(playerId) {
  if (!isConfigured) return [];
  try {
    const rows = await db.select("public_film", `select=*&player_id=eq.${enc(playerId)}&order=created_at.desc`);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

// Admin: the review queue (pending by default).
export async function listFilms(status = "pending") {
  const q = status ? `select=*&status=eq.${enc(status)}&order=created_at.desc` : "select=*&order=created_at.desc";
  return (await db.select("film_submissions", q)) || [];
}

// Admin: approve / reject a submission. Only approved rows reach public_film.
export async function setFilmStatus(id, status) {
  const rows = await db.update("film_submissions", `id=eq.${enc(id)}`, {
    status,
    reviewed_at: new Date().toISOString(),
  });
  return Array.isArray(rows) ? rows[0] : rows;
}
