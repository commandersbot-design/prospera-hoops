// Header account control: signed-out shows a "Sign in" popover that emails a
// magic link; signed-in shows the email, an Admin shortcut (admins only), and
// Sign out. Renders nothing when Supabase isn't configured.
import React, { useState } from "react";
import { useAuth } from "../lib/auth.jsx";
import { T, ui, inputStyle } from "../lib/theme.js";

const btn = (active) => ({
  ...ui,
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontWeight: 700,
  borderRadius: 6,
  padding: "8px 13px",
  cursor: "pointer",
  whiteSpace: "nowrap",
  color: active ? T.bg : T.textDim,
  background: active ? T.accent : "transparent",
  border: `1px solid ${active ? T.accent : T.border}`,
});

export default function AccountButton({ onOpenAdmin }) {
  const { configured, user, isAdmin, signIn, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [err, setErr] = useState("");

  if (!configured) return null;

  async function send(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("sending");
    setErr("");
    try {
      await signIn(email);
      setState("sent");
    } catch (e2) {
      setErr(String(e2.message || e2));
      setState("error");
    }
  }

  if (user) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isAdmin && (
          <button type="button" onClick={onOpenAdmin} style={btn(false)} title="Review profile claims">
            Claims
          </button>
        )}
        <span style={{ ...ui, fontSize: 11, color: T.textMute, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={user.email}>
          {user.email}
        </span>
        <button type="button" onClick={signOut} style={btn(false)}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((v) => !v)} style={btn(open)}>
        Sign in
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 50, width: 280, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, boxShadow: "0 16px 40px rgba(0,0,0,0.45)" }}>
          {state === "sent" ? (
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ ...ui, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, color: T.positive }}>Check your email ✓</div>
              <div style={{ ...ui, fontSize: 12.5, color: T.textDim, lineHeight: 1.5 }}>
                We sent a one-tap sign-in link to <b style={{ color: T.text }}>{email}</b>. Open it on this device.
              </div>
              <button type="button" onClick={() => { setOpen(false); setState("idle"); }} style={{ ...ui, fontSize: 11, color: T.signal, background: "transparent", border: "none", justifySelf: "start", cursor: "pointer", padding: "4px 0" }}>Done</button>
            </div>
          ) : (
            <form onSubmit={send} style={{ display: "grid", gap: 9 }}>
              <div style={{ ...ui, fontSize: 12.5, color: T.textDim, lineHeight: 1.5 }}>
                Sign in to claim or manage a player profile. No password — we email you a link.
              </div>
              <input style={inputStyle} type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
              {state === "error" && <div style={{ ...ui, fontSize: 11, color: T.danger }}>{err || "Couldn't send — try again."}</div>}
              <button type="submit" disabled={state === "sending"} style={{ ...ui, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, color: T.bg, background: T.accent, border: "none", borderRadius: 6, padding: "9px 14px", cursor: "pointer" }}>
                {state === "sending" ? "Sending…" : "Email me a link"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
