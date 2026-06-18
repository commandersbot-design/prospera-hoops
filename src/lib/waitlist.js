// Waitlist / "lock in" capture. Frictionless: just stores an email (optionally
// tied to a player profile) so a visitor can reserve their account on day one
// without waiting on a magic-link email. Real sign-in links go out later.
import { db, getSession } from "./supabaseClient.js";

export async function submitWaitlist({ email, name, role, player_id, player_name, kind, school, grad_year, position, note }) {
  const rows = await db.insert("waitlist", {
    email,
    name: name || null,
    role: role || null,
    player_id: player_id || null,
    player_name: player_name || null,
    kind: kind || "lockin",
    school: school || null,
    grad_year: grad_year || null,
    position: position || null,
    note: note || null,
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

// Admin: everyone who has locked in (RLS limits reads to admins).
export async function listWaitlist() {
  if (!getSession()) return [];
  return (await db.select("waitlist", "select=*&order=created_at.desc")) || [];
}
