// Public render of a player's self-maintained overlay (profile_overrides).
// Self-reported measurables are tagged so they're never confused with
// Prospera's evaluated data. Contact shows only when the player opted public.
import React from "react";
import { T, ui, display } from "../lib/theme.js";

const SR = () => (
  <span style={{ ...ui, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textMute, border: `1px solid ${T.border}`, borderRadius: 4, padding: "1px 5px", marginLeft: 6 }}>
    self-reported
  </span>
);

function normUrl(u) {
  if (!u) return "#";
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

export default function ClaimedOverlay({ override }) {
  if (!override) return null;
  const o = override;
  const measurables = [
    o.height && ["Height", o.height],
    o.weight && ["Weight", o.weight],
    o.gpa && ["GPA", o.gpa],
    o.grad_year && ["Class of", o.grad_year],
    o.positions && ["Positions", o.positions],
    o.recruiting_status && ["Recruiting", o.recruiting_status],
  ].filter(Boolean);
  const socials = [
    o.instagram && ["Instagram", o.instagram.startsWith("@") ? `https://instagram.com/${o.instagram.slice(1)}` : normUrl(o.instagram)],
    o.twitter && ["Twitter / X", o.twitter.startsWith("@") ? `https://x.com/${o.twitter.slice(1)}` : normUrl(o.twitter)],
    o.hudl && ["Hudl", normUrl(o.hudl)],
  ].filter(Boolean);
  const films = (o.film_links || []).filter((f) => f && f.url);

  const hasAnything = o.bio || measurables.length || socials.length || films.length || (o.contact_public && (o.contact_email || o.contact_phone));
  if (!hasAnything) return null;

  return (
    <section style={{ border: `1px solid ${T.border}`, borderRadius: 8, background: T.surface, padding: 16, display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ ...ui, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, color: T.positive }}>✓ Claimed</span>
        <span style={{ ...ui, fontSize: 11, color: T.textMute }}>Maintained by the player / family</span>
      </div>

      {o.bio && <p style={{ ...ui, fontSize: 14, color: T.textDim, lineHeight: 1.6, margin: 0, maxWidth: 680 }}>{o.bio}</p>}

      {measurables.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {measurables.map(([k, v]) => (
            <div key={k} style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 10px" }}>
              <span style={{ ...ui, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textMute }}>{k}{["Height", "Weight", "GPA", "Class of", "Positions"].includes(k) && <SR />}</span>
              <div style={{ ...display, fontSize: 18, fontWeight: 700, color: T.text }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {films.length > 0 && (
        <div style={{ display: "grid", gap: 6 }}>
          <span style={{ ...ui, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, color: T.textMute }}>Film</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {films.map((f, i) => (
              <a key={i} href={normUrl(f.url)} target="_blank" rel="noreferrer" style={{ ...ui, fontSize: 12.5, color: T.bg, background: T.accent, borderRadius: 6, padding: "7px 12px", textDecoration: "none", fontWeight: 700 }}>
                ▶ {f.label || "Watch film"}
              </a>
            ))}
          </div>
        </div>
      )}

      {(socials.length > 0 || (o.contact_public && (o.contact_email || o.contact_phone))) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
          {socials.map(([k, url]) => (
            <a key={k} href={url} target="_blank" rel="noreferrer" style={{ ...ui, fontSize: 12.5, color: T.signal, textDecoration: "none" }}>{k} ↗</a>
          ))}
          {o.contact_public && o.contact_email && <a href={`mailto:${o.contact_email}`} style={{ ...ui, fontSize: 12.5, color: T.signal, textDecoration: "none" }}>{o.contact_email}</a>}
          {o.contact_public && o.contact_phone && <span style={{ ...ui, fontSize: 12.5, color: T.textDim }}>{o.contact_phone}</span>}
        </div>
      )}
    </section>
  );
}
