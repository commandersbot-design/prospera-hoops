// Daily "scouts viewed you" digest. Triggered by Vercel Cron (see vercel.json:
// crons → /api/scout-digest @ 13:00 UTC ≈ 9am ET). Finds every claimed player who
// was viewed by coaches/scouts in the last 24h, looks up the owner's email, and
// emails: "N college coaches viewed [player] today."
//
// Env vars (Vercel · Production):
//   CRON_SECRET                 any random string — Vercel sends it as the bearer
//                               token on cron invocations, so we can verify it.
//   SUPABASE_SERVICE_ROLE_KEY   Supabase → Settings → API → service_role (secret)
//   RESEND_API_KEY              re_...
//   (SUPABASE_URL or VITE_SUPABASE_URL — already present)
// Until configured it returns 503 and sends nothing.

const FROM = "Prospera Hoops <jalen@prosperahoops.com>";

export default async function handler(req, res) {
  // Only the Vercel cron (which carries CRON_SECRET) may run this.
  const SECRET = process.env.CRON_SECRET;
  const auth = req.headers.authorization || "";
  if (SECRET && auth !== `Bearer ${SECRET}`) { res.status(401).json({ error: "unauthorized" }); return; }

  const RESEND = process.env.RESEND_API_KEY;
  const SB_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!RESEND || !SB_URL || !SVC) { res.status(503).json({ error: "unconfigured" }); return; }

  try {
    // Service-role-only RPC: per claimed+viewed player → owner email + scout count.
    const r = await fetch(`${SB_URL}/rest/v1/rpc/scout_digest_due`, {
      method: "POST",
      headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json" },
      body: "{}",
    });
    const rows = await r.json().catch(() => null);
    if (!Array.isArray(rows)) { res.status(502).json({ error: "rpc_failed", detail: rows }); return; }

    let sent = 0;
    for (const row of rows) {
      if (!row.owner_email || !row.scouts_today) continue;
      const name = row.player_name || "your profile";
      const n = row.scouts_today;
      const plural = n === 1 ? "" : "es";
      const subject = `${n} college coach${plural} viewed ${name}`;
      const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#111">
        <p style="font-size:20px;font-weight:800;color:#FF6A1A;margin:0 0 6px">PROSPERA HOOPS</p>
        <p style="font-size:16px;line-height:1.6"><b>${n} college coach${plural}</b> viewed <b>${name}</b> on Prospera in the last day. 👀</p>
        <p style="font-size:14px;line-height:1.6;color:#444">Keep the profile sharp — add film, recruiting info, and your latest measurables so coaches see your best.</p>
        <p style="margin:22px 0"><a href="https://prosperahoops.com" style="background:#FF6A1A;color:#0B0E13;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:700">Open your profile</a></p>
        <p style="color:#888;font-size:12px">The DMV's home court — real stats, real eyes.</p>
      </div>`;
      const er = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM, to: row.owner_email, subject, html }),
      });
      if (er.ok) sent++;
    }
    res.status(200).json({ ok: true, candidates: rows.length, sent });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
