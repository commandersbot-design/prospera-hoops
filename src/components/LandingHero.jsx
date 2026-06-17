// Landing hero (§4.1) — graphite re-skin. Eyebrow → h1 "You're already on the
// board." → sub → name-search (the claim close) → "Claim your profile — free" →
// Founding band (capacity framing, never a live ticker). The hero Scout Card
// features a real, verified player. Reads the §2 design tokens.
import React, { useState } from "react";
import ScoutCard from "./ScoutCard";
import { FOUNDING_CAP } from "../lib/tiers.config";

const DISPLAY = "var(--font-display)";
const BODY = "var(--font-body)";

export default function LandingHero({ featured, onSearch, onClaim }) {
  const [q, setQ] = useState("");
  const submit = (e) => { e.preventDefault(); onSearch?.(q.trim()); };
  return (
    <section style={{ display: "grid", gap: 34, gridTemplateColumns: "minmax(0,1fr)", padding: "8px 0 6px" }} className="ds-fade-up">
      <div style={{ display: "grid", gap: 30, gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)", alignItems: "center" }} data-hero-grid>
        {/* LEFT — copy + search + CTA */}
        <div style={{ display: "grid", gap: 20, minWidth: 0 }}>
          <div>
            <div className="ds-eyebrow">The DMV&rsquo;s scouting platform — high school, AAU &amp; more</div>
            <h1 style={{ margin: "12px 0 0", fontFamily: DISPLAY, fontWeight: 800, textTransform: "uppercase", fontSize: "clamp(40px, 6.4vw, 60px)", lineHeight: 0.98, letterSpacing: "0.005em", color: "var(--ink)" }}>
              You&rsquo;re already<br />on the board.
            </h1>
            <p style={{ margin: "16px 0 0", fontFamily: BODY, fontSize: 16, lineHeight: 1.55, color: "var(--muted)", maxWidth: "48ch" }}>
              Real stats, real development — every DMV hooper, in one place. No fake rankings. No hype.
            </p>
          </div>

          {/* name-search — the close (§6.2) */}
          <form onSubmit={submit} style={{ display: "flex", gap: 8, maxWidth: 460 }}>
            <input
              value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your name…"
              aria-label="Search your name"
              style={{
                flex: 1, minWidth: 0, fontFamily: BODY, fontSize: 15, color: "var(--ink)",
                background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-control)",
                padding: "13px 15px", outline: "none",
              }}
            />
            <button type="submit" style={{
              fontFamily: DISPLAY, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 14,
              color: "#1c0d03", background: "var(--orange)", border: "none", borderRadius: "var(--r-control)",
              padding: "0 18px", cursor: "pointer", whiteSpace: "nowrap",
            }}>Find me</button>
          </form>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" onClick={onClaim} style={{
              fontFamily: DISPLAY, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 14.5,
              color: "#1c0d03", background: "var(--orange)", border: "none", borderRadius: "var(--r-control)",
              padding: "13px 22px", cursor: "pointer",
            }}>Claim your profile — free</button>
            <span style={{ fontFamily: BODY, fontSize: 12.5, color: "var(--faint)" }}>Free forever · 13+</span>
          </div>

          {/* Founding band — capacity, never a live count (§5.4) */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12, marginTop: 2,
            background: "linear-gradient(180deg, rgba(245,196,81,.08), rgba(224,162,60,.04))",
            border: "1px solid rgba(245,196,81,.3)", borderRadius: 12, padding: "11px 14px", maxWidth: 460,
          }}>
            <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 22, color: "var(--gold-a)", lineHeight: 1 }}>{FOUNDING_CAP}</span>
            <span style={{ fontFamily: BODY, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>
              <b style={{ color: "var(--ink)" }}>Founding spots</b> — claim early and Prospera+ is free for life.
            </span>
          </div>
        </div>

        {/* RIGHT — the signature Scout Card */}
        <div style={{ minWidth: 0 }}>
          {featured && <ScoutCard player={featured} />}
        </div>
      </div>

      <style>{`@media (max-width: 860px){ [data-hero-grid]{ grid-template-columns: minmax(0,1fr) !important; } }`}</style>
    </section>
  );
}
