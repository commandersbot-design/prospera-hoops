// Scout Card — the signature element (§2.4). Raised bg, orange top accent, corner
// brackets, headshot slot, Saira name + meta, badge row, 3-up stat blocks each with
// a teal percentile bar, optional Development Arc sparkline. Reads the §2 tokens.
import React from "react";
import { BadgeRow } from "./ProsperaBadges";

const DISPLAY = "var(--font-display)";
const BODY = "var(--font-body)";

// 4 L-shaped corner brackets that frame the card.
function Brackets() {
  const L = 16, T = 2.5, c = "var(--orange)";
  const seg = (style) => <span style={{ position: "absolute", background: c, opacity: 0.9, ...style }} />;
  const corner = (pos) => {
    const v = pos.includes("t") ? { top: 10 } : { bottom: 10 };
    const h = pos.includes("l") ? { left: 10 } : { right: 10 };
    return (
      <span key={pos} aria-hidden="true">
        {seg({ ...v, ...h, width: L, height: T, borderRadius: 1 })}
        {seg({ ...v, ...h, width: T, height: L, borderRadius: 1 })}
      </span>
    );
  };
  return <>{["tl", "tr", "bl", "br"].map(corner)}</>;
}

function HeadshotSlot({ src, name }) {
  const initials = (name || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      width: 92, flexShrink: 0, aspectRatio: "3 / 4", borderRadius: 12, overflow: "hidden",
      border: "1px solid var(--line)", background: "var(--surface)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {src
        ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <span style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 800, color: "var(--faint)" }}>{initials}</span>}
    </div>
  );
}

// label + value (Saira) + teal percentile track.
function StatBlock({ label, value, pct }) {
  const p = Math.max(2, Math.min(100, pct ?? 0));
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
        <span style={{ fontFamily: BODY, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--faint)" }}>{label}</span>
        {pct != null && <span style={{ fontFamily: BODY, fontSize: 9, color: "var(--teal)", fontWeight: 700 }}>{p}%</span>}
      </div>
      <div style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 800, color: "var(--ink)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value ?? "—"}</div>
      {pct != null && (
        <div style={{ height: 4, borderRadius: 4, background: "rgba(244,242,237,.08)", overflow: "hidden" }}>
          <div style={{ width: `${p}%`, height: "100%", background: "var(--teal)", borderRadius: 4 }} />
        </div>
      )}
    </div>
  );
}

// Orange area sparkline — the Development Arc at a glance.
function ArcSpark({ points }) {
  if (!points || points.length < 2) return null;
  const W = 280, H = 40, n = points.length;
  const ys = points.filter((y) => y != null);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (lo === hi) { lo -= 1; hi += 1; }
  const xAt = (i) => (i * W) / (n - 1);
  const yAt = (y) => H - 4 - ((y - lo) / (hi - lo)) * (H - 8);
  const line = points.map((y, i) => (y == null ? null : `${i ? "L" : "M"}${xAt(i).toFixed(1)},${yAt(y).toFixed(1)}`)).filter(Boolean).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 40, display: "block" }} aria-hidden="true">
      <defs><linearGradient id="sc-arc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--orange)" stopOpacity="0.34" /><stop offset="1" stopColor="var(--orange)" stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill="url(#sc-arc)" />
      <path d={line} fill="none" stroke="var(--orange)" strokeWidth="2" />
    </svg>
  );
}

export default function ScoutCard({ player, style }) {
  const { name, headshot, meta, founding, accountStatus, statsVerified, stats = [], arc } = player || {};
  return (
    <div style={{
      position: "relative", background: "var(--raised)", borderRadius: 16,
      border: "1px solid var(--line)", borderTop: "3px solid var(--orange)",
      padding: "22px 22px 20px", overflow: "hidden",
      boxShadow: "0 18px 50px -24px rgba(0,0,0,.7)", ...style,
    }}>
      <Brackets />
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <HeadshotSlot src={headshot} name={name} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ margin: 0, fontFamily: DISPLAY, fontSize: 31, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.01em", lineHeight: 1.02, color: "var(--ink)" }}>{name}</h3>
          {meta && <div style={{ fontFamily: BODY, fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>{meta}</div>}
          <div style={{ marginTop: 10 }}>
            <BadgeRow founding={founding} accountStatus={accountStatus} statsVerified={statsVerified} />
          </div>
        </div>
      </div>

      {stats.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(3, stats.length)}, 1fr)`, gap: 16, marginTop: 18 }}>
          {stats.slice(0, 3).map((s) => <StatBlock key={s.label} {...s} />)}
        </div>
      )}

      {arc && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
          <div style={{ fontFamily: BODY, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 6 }}>Development Arc</div>
          <ArcSpark points={arc} />
        </div>
      )}
    </div>
  );
}
