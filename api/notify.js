// Transactional email via Resend. Currently sends the "your claim was approved"
// notification when an admin approves a claim.
//
// Security: this is self-gating. It resolves the claim by asking Supabase (with
// the CALLER's token) via the admin-only `admin_all_claims` RPC — a non-admin
// caller gets nothing back, so no email can be sent for a claim they can't see.
//
// Env vars (Vercel · Production):
//   RESEND_API_KEY        re_...   (your Resend API key — same one as SMTP)
//   SUPABASE_URL          https://ynovrdtedgcqceqhbgzx.supabase.co
//   SUPABASE_ANON_KEY     the public anon key (Supabase → Settings → API)
// Until these are set it returns 503 and the app just skips the email.

const FROM = "Prospera Hoops <jalen@prosperahoops.com>";

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "method_not_allowed" }); return; }
  const RESEND = process.env.RESEND_API_KEY;
  const SB_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const SB_ANON = process.env.SUPABASE_ANON_KEY;
  if (!RESEND || !SB_URL || !SB_ANON) { res.status(503).json({ error: "unconfigured" }); return; }

  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) { res.status(401).json({ error: "no_auth" }); return; }
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const { event, claimId } = body;
  if (event !== "claim_approved" || !claimId) { res.status(400).json({ error: "bad_request" }); return; }

  try {
    // Resolve the claim + claimant email via the admin-gated RPC, as the caller.
    const r = await fetch(`${SB_URL}/rest/v1/rpc/admin_all_claims`, {
      method: "POST",
      headers: { apikey: SB_ANON, Authorization: auth, "Content-Type": "application/json" },
      body: "{}",
    });
    const claims = await r.json().catch(() => []);
    const claim = Array.isArray(claims) ? claims.find((c) => c.id === claimId) : null;
    if (!claim || !claim.claimant_email) { res.status(403).json({ error: "not_allowed_or_no_email" }); return; }

    const name = claim.player_name || "your profile";
    const isTeam = String(claim.player_id || "").startsWith("team:");
    const subject = `Your Prospera claim on ${name} is approved`;
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#111">
      <p style="font-size:20px;font-weight:800;color:#FF6A1A;margin:0 0 6px">PROSPERA HOOPS</p>
      <p style="font-size:15px;line-height:1.6">Good news — your claim on <b>${name}</b> has been approved. ✅</p>
      <p style="font-size:15px;line-height:1.6">${isTeam
        ? "Coach HQ for your program is unlocked on your account — scouting, matchups, and your-team tools."
        : "You can now manage the profile: add a bio, film, recruiting info, and self-reported measurables (we review edits before they go live)."}</p>
      <p style="margin:22px 0"><a href="https://prosperahoops.com" style="background:#FF6A1A;color:#0B0E13;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:700">Open Prospera</a></p>
      <p style="color:#888;font-size:12px;line-height:1.5">The DMV's home court — real stats, real development.<br/>Reply to this email if you need anything.</p>
    </div>`;

    const er = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: claim.claimant_email, subject, html }),
    });
    if (!er.ok) { const t = await er.text().catch(() => ""); res.status(502).json({ error: "send_failed", detail: t.slice(0, 200) }); return; }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
