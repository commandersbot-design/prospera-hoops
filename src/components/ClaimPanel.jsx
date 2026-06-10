// Supabase-backed claim flow (used when Supabase is configured; otherwise
// App.jsx renders the email fallback form). Requires sign-in, then records a
// claim row for owner review. Shows current claim status if one exists.
import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/auth.jsx";
import { submitClaim, myClaimForPlayer } from "../lib/profiles.js";
import { T, ui, inputStyle } from "../lib/theme.js";

const wrap = { background: "var(--prospera-accent-bg-faint)", border: `1px dashed ${T.border}`, padding: 16, display: "grid", gap: 10 };
const cap = { ...ui, fontSize: 10, letterSpacing: "0.14em", color: T.accent, textTransform: "uppercase", fontWeight: 700 };

function StatusBadge({ status }) {
  const map = {
    pending: { c: T.warn, t: "Claim pending review" },
    approved: { c: T.positive, t: "Claim approved — you can edit this profile" },
    rejected: { c: T.danger, t: "Claim not approved" },
  };
  const s = map[status] || map.pending;
  return <div style={{ ...ui, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, color: s.c }}>{s.t}</div>;
}

export default function ClaimPanel({ prospect, onClose, onClaimed }) {
  const { user, signIn } = useAuth();
  const [existing, setExisting] = useState(undefined); // undefined = loading
  const [f, setF] = useState({ role: "Player", proof: "", message: "" });
  const [state, setState] = useState("idle"); // idle | sending | error
  const [err, setErr] = useState("");

  // Inline sign-in (so users can claim without leaving the panel).
  const [email, setEmail] = useState("");
  const [signState, setSignState] = useState("idle");

  useEffect(() => {
    let live = true;
    if (user) {
      myClaimForPlayer(prospect.id).then((c) => live && setExisting(c)).catch(() => live && setExisting(null));
    } else {
      setExisting(null);
    }
    return () => { live = false; };
  }, [user, prospect.id]);

  async function doSignIn(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setSignState("sending");
    try { await signIn(email); setSignState("sent"); } catch { setSignState("error"); }
  }

  async function submit(e) {
    e.preventDefault();
    setState("sending");
    setErr("");
    try {
      const row = await submitClaim({
        player_id: prospect.id,
        player_name: prospect.name,
        school: prospect.school,
        role: f.role,
        proof: f.proof,
        message: f.message,
      });
      setExisting(row || { status: "pending" });
      onClaimed?.();
    } catch (e2) {
      setErr(String(e2.message || e2));
      setState("error");
    }
  }

  // --- not signed in: inline magic-link ---
  if (!user) {
    return (
      <div style={wrap}>
        <div style={cap}>Claim this profile</div>
        <div style={{ ...ui, fontSize: 13, color: T.textDim, lineHeight: 1.55, maxWidth: 640 }}>
          Are you {prospect.name}, a parent, or their coach? Sign in to claim — once we verify it's you, you can add film, fix your info, and own your recruiting page. <b style={{ color: T.textDim }}>We don't build it for you; you do.</b>
        </div>
        {signState === "sent" ? (
          <div style={{ ...ui, fontSize: 12.5, color: T.positive }}>Check your email for a one-tap sign-in link, then come back to finish your claim.</div>
        ) : (
          <form onSubmit={doSignIn} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input style={{ ...inputStyle, flex: "1 1 200px" }} type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button type="submit" disabled={signState === "sending"} style={{ ...ui, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, color: T.bg, background: T.accent, border: "none", borderRadius: 6, padding: "9px 16px", cursor: "pointer" }}>
              {signState === "sending" ? "Sending…" : "Sign in to claim"}
            </button>
          </form>
        )}
        <button type="button" onClick={onClose} style={{ ...ui, fontSize: 11, color: T.textDim, background: "transparent", border: "none", justifySelf: "start", cursor: "pointer", padding: "4px 0" }}>Cancel</button>
      </div>
    );
  }

  if (existing === undefined) {
    return <div style={wrap}><div style={{ ...ui, fontSize: 12, color: T.textMute }}>Loading…</div></div>;
  }

  // --- already claimed: show status ---
  if (existing) {
    return (
      <div style={wrap}>
        <div style={cap}>Your claim</div>
        <StatusBadge status={existing.status} />
        <div style={{ ...ui, fontSize: 12.5, color: T.textDim, lineHeight: 1.55, maxWidth: 640 }}>
          {existing.status === "approved"
            ? "Use “Edit my profile” above to update your bio, film, and info."
            : existing.status === "rejected"
            ? "If you think this is a mistake, reach out and we'll take another look."
            : "We're reviewing your claim. You'll be able to edit this profile as soon as it's approved."}
        </div>
        <button type="button" onClick={onClose} style={{ ...ui, fontSize: 11, color: T.signal, background: "transparent", border: "none", justifySelf: "start", cursor: "pointer", padding: "4px 0" }}>Close</button>
      </div>
    );
  }

  // --- signed in, no claim yet: the form ---
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  return (
    <form onSubmit={submit} style={wrap}>
      <div style={cap}>Claim this profile</div>
      <div style={{ ...ui, fontSize: 13, color: T.textDim, lineHeight: 1.55, maxWidth: 640 }}>
        Tell us who you are. Once we verify it's really {prospect.name}, you can add film, fix your info, and own your recruiting page.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
        <select value={f.role} onChange={set("role")} style={inputStyle}>
          <option>Player</option><option>Parent / guardian</option><option>Coach</option>
        </select>
        <input style={inputStyle} placeholder="Proof it's you — IG handle or link" value={f.proof} onChange={set("proof")} />
      </div>
      <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} placeholder="Anything to add (optional)" value={f.message} onChange={set("message")} />
      {state === "error" && <div style={{ ...ui, fontSize: 11, color: T.danger }}>{err || "Couldn't submit — try again."}</div>}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button type="submit" disabled={state === "sending"} style={{ ...ui, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, color: T.bg, background: T.accent, border: "none", borderRadius: 6, padding: "9px 16px", cursor: "pointer" }}>
          {state === "sending" ? "Submitting…" : "Submit claim"}
        </button>
        <button type="button" onClick={onClose} style={{ ...ui, fontSize: 11, color: T.textDim, background: "transparent", border: "none", cursor: "pointer" }}>Cancel</button>
      </div>
      <div style={{ ...ui, fontSize: 9, letterSpacing: "0.06em", color: T.textMute }}>Reviewed by Prospera Hoops — we verify before any profile is edited.</div>
    </form>
  );
}
