// Owner-only claim review. Lists pending claims, lets you approve (unlocks the
// player's self-edit via RLS) or reject. Gated by useAuth().isAdmin — and the
// underlying RLS only lets admins update claim status, so this is safe even if
// the route is reached some other way.
import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../lib/auth.jsx";
import { listClaims, setClaimStatus } from "../lib/profiles.js";
import { T, ui, display } from "../lib/theme.js";

const tab = (active) => ({
  ...ui, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: active ? 700 : 600,
  color: active ? T.bg : T.textDim, background: active ? T.accent : "transparent",
  border: `1px solid ${active ? T.accent : T.border}`, borderRadius: 6, padding: "7px 13px", cursor: "pointer",
});

function normProof(p) {
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  const h = p.replace(/^@/, "");
  return `https://instagram.com/${h}`;
}

export default function AdminClaims({ onOpenProfile }) {
  const { isAdmin, loading } = useAuth();
  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    setRows(null);
    listClaims(status).then(setRows).catch(() => setRows([]));
  }, [status]);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  if (loading) return <div style={{ ...ui, color: T.textMute, padding: 20 }}>Loading…</div>;
  if (!isAdmin) return <div style={{ ...ui, color: T.textMute, padding: 20 }}>Admins only.</div>;

  async function act(id, next) {
    setBusy(id);
    try { await setClaimStatus(id, next); load(); } finally { setBusy(null); }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h2 style={{ ...display, fontSize: 30, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em", color: T.text, margin: 0 }}>Profile claims</h2>
      <div style={{ display: "flex", gap: 8 }}>
        {["pending", "approved", "rejected"].map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)} style={tab(status === s)}>{s}</button>
        ))}
      </div>

      {rows === null ? (
        <div style={{ ...ui, color: T.textMute }}>Loading claims…</div>
      ) : rows.length === 0 ? (
        <div style={{ ...ui, color: T.textMute }}>No {status} claims.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((c) => {
            const proof = normProof(c.proof);
            return (
              <div key={c.id} style={{ border: `1px solid ${T.border}`, borderRadius: 8, background: T.surface, padding: 14, display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <button type="button" onClick={() => onOpenProfile?.(c.player_id)} style={{ ...display, fontSize: 20, fontWeight: 700, color: T.signal, background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
                      {c.player_name || c.player_id}
                    </button>
                    {c.school && <span style={{ ...ui, fontSize: 12, color: T.textMute, marginLeft: 8 }}>{c.school}</span>}
                  </div>
                  <span style={{ ...ui, fontSize: 11, color: T.textMute }}>{c.role}</span>
                </div>
                <div style={{ ...ui, fontSize: 12.5, color: T.textDim, display: "grid", gap: 3 }}>
                  {proof && <span>Proof: <a href={proof} target="_blank" rel="noreferrer" style={{ color: T.signal }}>{c.proof}</a></span>}
                  {c.message && <span style={{ color: T.textMute }}>“{c.message}”</span>}
                </div>
                {status === "pending" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" disabled={busy === c.id} onClick={() => act(c.id, "approved")} style={{ ...ui, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, color: T.bg, background: T.positive, border: "none", borderRadius: 6, padding: "8px 14px", cursor: "pointer" }}>Approve</button>
                    <button type="button" disabled={busy === c.id} onClick={() => act(c.id, "rejected")} style={{ ...ui, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, color: T.danger, background: "transparent", border: `1px solid ${T.danger}`, borderRadius: 6, padding: "8px 14px", cursor: "pointer" }}>Reject</button>
                  </div>
                )}
                {status !== "pending" && (
                  <button type="button" disabled={busy === c.id} onClick={() => act(c.id, status === "approved" ? "rejected" : "approved")} style={{ ...ui, fontSize: 11, color: T.textDim, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 12px", cursor: "pointer", justifySelf: "start" }}>
                    {status === "approved" ? "Revoke → reject" : "Re-approve"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
