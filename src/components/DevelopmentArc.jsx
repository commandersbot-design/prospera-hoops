import React, { useState } from "react";

/**
 * Development Arc views — the longitudinal moat, rendered from the separable
 * model in src/lib/developmentArc.js. Hero = efficiency/rate over seasons (NEVER
 * raw PPG as the headline line) + a role-context band + an honest one-line read.
 * Supporting: growth track, by-season "receipts" table. Secondary: small-
 * multiples + a compact year-over-year leap for tight surfaces.
 *
 * A1 Graphite theme; Saira Condensed (UPPERCASE nameplate/headings) + Hanken
 * Grotesk (everything), tabular-nums on numbers. No chart lib — hand-rolled SVG.
 */

const A = {
  bg: "#1d1e22", surface: "#26282d", inset: "#1d1e22", border: "#383a40",
  text: "#ececec", textHi: "#f6f6f4", mut: "#9a9ca2", faint: "#6e7178",
  accent: "#FF6A1A", sage: "#6fae9b", info: "#54c6e0", gold: "#d2af52", amber: "#c9a14a",
};
const DISPLAY = "'Saira Condensed', sans-serif";
const BODY = "'Hanken Grotesk', sans-serif";
const num = { fontFamily: BODY, fontVariantNumeric: "tabular-nums" };

const Eyebrow = ({ children, color = A.info }) => (
  <div style={{ fontFamily: BODY, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color }}>{children}</div>);
const Label = ({ children, color = A.mut, style }) => (
  <div style={{ fontFamily: BODY, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color, ...style }}>{children}</div>);

const fmtPct = (v) => (v == null ? "—" : `${v.toFixed(1)}%`);
const fmt1 = (v) => (v == null ? "—" : v.toFixed(1));
const deltaChip = (d, suffix = "") => {
  if (d == null) return null;
  const up = d >= 0;
  return <span style={{ ...num, fontSize: 11, fontWeight: 700, color: up ? A.sage : A.amber }}>{up ? "▲" : "▼"} {Math.abs(d).toFixed(1)}{suffix}</span>;
};

// ---- SVG multi-series line chart (each series scaled to its own range) ------
function ArcChart({ chart, seasons }) {
  const W = 640, H = 200, padL = 36, padR = 16, padT = 16, padB = 34;
  const xs = seasons.map((s) => s.season);
  const n = xs.length;
  const xAt = (i) => n === 1 ? (padL + (W - padL - padR) / 2) : padL + (i * (W - padL - padR)) / (n - 1);
  const series = [
    { key: "ts", label: "TS%", color: A.accent, dash: null, pts: chart.ts },
    { key: "per36pts", label: "per-36 PTS", color: A.sage, dash: "5 4", pts: chart.per36pts },
    { key: "eval", label: "Prospera eval", color: A.gold, dash: null, pts: chart.eval },
  ].filter((s) => s.pts.some((p) => p.y != null)); // eval line only if data exists

  const yScale = (pts) => {
    const ys = pts.filter((p) => p.y != null).map((p) => p.y);
    if (!ys.length) return () => null;
    let lo = Math.min(...ys), hi = Math.max(...ys);
    if (lo === hi) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * 0.15;
    lo -= pad; hi += pad;
    return (y) => (y == null ? null : padT + (H - padT - padB) * (1 - (y - lo) / (hi - lo)));
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Development arc chart">
      {/* baseline grid */}
      {[0, 0.5, 1].map((t) => <line key={t} x1={padL} x2={W - padR} y1={padT + (H - padT - padB) * t} y2={padT + (H - padT - padB) * t} stroke={A.border} strokeWidth="1" />)}
      {/* x labels */}
      {seasons.map((s, i) => (
        <text key={s.season} x={xAt(i)} y={H - 12} fill={A.mut} fontFamily={BODY} fontSize="11" textAnchor="middle">{s.season}</text>
      ))}
      {series.map((ser) => {
        const yAt = yScale(ser.pts);
        const pts = ser.pts.map((p, i) => ({ ...p, px: xAt(i), py: yAt(p.y) })).filter((p) => p.py != null);
        const d = pts.map((p, i) => `${i ? "L" : "M"}${p.px},${p.py}`).join(" ");
        return (
          <g key={ser.key}>
            {pts.length > 1 && <path d={d} fill="none" stroke={ser.color} strokeWidth="2.5" strokeDasharray={ser.dash || undefined} />}
            {pts.map((p, i) => <circle key={i} cx={p.px} cy={p.py} r={p.small ? 3.5 : 4.5} fill={p.small ? A.bg : ser.color} stroke={ser.color} strokeWidth="2" />)}
          </g>
        );
      })}
    </svg>
  );
}

function Legend() {
  const items = [["Scoring efficiency", A.accent, false], ["Scoring pace (per 36 min)", A.sage, true], ["Prospera grade", A.gold, false]];
  return (
    <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 6 }}>
      {items.map(([l, c, dash]) => (
        <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: BODY, fontSize: 11, color: A.mut }}>
          <span style={{ width: 18, height: 0, borderTop: `2px ${dash ? "dashed" : "solid"} ${c}` }} />{l}
        </span>
      ))}
    </div>
  );
}

// ---- Role context band ------------------------------------------------------
function RoleBand({ seasons }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${seasons.length}, 1fr)`, gap: 8, marginTop: 14 }}>
      {seasons.map((s, i) => {
        const latest = i === seasons.length - 1;
        return (
          <div key={s.season} style={{
            border: `1px solid ${latest ? A.accent : A.border}`, background: latest ? "rgba(255, 106, 26,0.10)" : A.inset,
            borderRadius: 8, padding: "9px 10px",
          }}>
            <Label color={latest ? A.accent : A.faint} style={{ fontSize: 9 }}>{s.season}</Label>
            <div style={{ fontFamily: DISPLAY, fontSize: 15, fontWeight: 700, textTransform: "uppercase", color: A.textHi, marginTop: 3 }}>{s.context.roleTag}</div>
            <div style={{ ...num, fontSize: 11, color: A.mut, marginTop: 3 }}>
              {[s.derived.usageLoad != null ? `${s.derived.usageLoad} poss/game` : null, s.mpg != null ? `${s.mpg} min/game` : null].filter(Boolean).join(" · ")}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================ HERO ==========================================
export function DevelopmentArc({ arc }) {
  if (!arc || !arc.seasons.length) return null;
  const single = !arc.multiSeason;
  return (
    <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 12, padding: "18px 20px", fontFamily: BODY, color: A.text }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <Eyebrow>Development Arc</Eyebrow>
        <span style={{ fontFamily: BODY, fontSize: 11, color: A.mut }}>
          {arc.tracked} season{arc.tracked === 1 ? "" : "s"} tracked{single ? " · more fills in as we follow him" : ""}
        </span>
      </div>
      <div style={{ fontFamily: BODY, fontSize: 12, color: A.mut, marginTop: 6, lineHeight: 1.5 }}>
        How he&rsquo;s grown season to season. We track <b style={{ color: A.text }}>how efficiently he scores</b> and{" "}
        <b style={{ color: A.text }}>his role</b> &mdash; not just raw points &mdash; so the growth is real, not just more shots.
      </div>

      <div style={{ marginTop: 12 }}>
        <ArcChart chart={arc.chart} seasons={arc.seasons} />
        <Legend />
      </div>

      <RoleBand seasons={arc.seasons} />

      <div style={{ fontFamily: BODY, fontSize: 13, lineHeight: 1.55, color: A.textHi, marginTop: 14, paddingLeft: 12, borderLeft: `3px solid ${A.accent}` }}>
        {arc.read}
      </div>
    </div>
  );
}

// ============================ GROWTH TRACK ==================================
export function GrowthTrack({ arc, prospect }) {
  const ht = prospect?.heightInches, wt = prospect?.weightLbs;
  const fmtHt = (i) => (i == null ? "—" : `${Math.floor(i / 12)}'${i % 12}"`);
  return (
    <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 12, padding: "16px 20px", fontFamily: BODY, color: A.text }}>
      <Eyebrow>Growth Track</Eyebrow>
      <div style={{ display: "flex", gap: 26, flexWrap: "wrap", marginTop: 12 }}>
        {[["Height", fmtHt(ht)], ["Weight", wt ? `${wt} lb` : "—"], ["Class", prospect?.gradYear ? `'${String(prospect.gradYear).slice(2)}` : "—"]].map(([l, v]) => (
          <div key={l}>
            <div style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 700, color: A.textHi, ...num }}>{v}</div>
            <Label style={{ marginTop: 4 }}>{l}</Label>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: BODY, fontSize: 11, color: A.faint, marginTop: 12, lineHeight: 1.5 }}>
        Per-season height/weight history isn't tracked yet — current measurables only. Growth curve fills in as we log him over time.
      </div>
    </div>
  );
}

// ============================ BY SEASON TABLE ===============================
export function BySeasonTable({ arc }) {
  const [open, setOpen] = useState(false);
  const th = { fontFamily: BODY, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: A.mut, padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap" };
  const td = { ...num, fontSize: 13, color: A.text, padding: "8px 10px", textAlign: "right" };
  const base = [["Season", "season"], ["GP", "gp"], ["PTS", "pts"], ["REB", "reb"], ["AST", "ast"]];
  const extra = [["TS%", "ts"], ["A:TO", "atr"], ["per-36 PTS", "p36"], ["eFG%", "efg"], ["Min/G", "mpg"], ["Role", "role"]];
  const cols = open ? [...base, ...extra] : base;
  const cell = (s, k) => {
    switch (k) {
      case "season": return s.season;
      case "gp": return s.gp;
      case "pts": return fmt1(s.raw.pts);
      case "ts": return fmtPct(s.derived.ts);
      case "atr": return s.derived.atr == null ? "—" : s.derived.atr.toFixed(1);
      case "p36": return s.derived.per36.pts == null ? "—" : s.derived.per36.pts.toFixed(1);
      case "reb": return fmt1(s.raw.reb);
      case "ast": return fmt1(s.raw.ast);
      case "efg": return fmtPct(s.derived.efg);
      case "mpg": return s.mpg == null ? "—" : s.mpg.toFixed(1);
      case "role": return s.context.roleTag;
      default: return "";
    }
  };
  return (
    <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 12, padding: "16px 20px", fontFamily: BODY, color: A.text }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <Eyebrow>By Season</Eyebrow>
        <button type="button" onClick={() => setOpen((v) => !v)} style={{ fontFamily: BODY, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: A.info, background: "transparent", border: `1px solid ${A.border}`, borderRadius: 6, padding: "5px 9px", cursor: "pointer" }}>{open ? "Less" : "Full stat set"}</button>
      </div>
      <div style={{ overflowX: "auto", marginTop: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{cols.map(([l], i) => <th key={l} style={{ ...th, textAlign: i === 0 ? "left" : "right", color: l === "TS%" ? A.accent : A.mut }}>{l}</th>)}</tr></thead>
          <tbody>
            {arc.seasons.map((s, ri) => {
              const latest = ri === arc.seasons.length - 1;
              return (
                <tr key={s.season} style={{ borderTop: `1px solid ${A.border}`, background: latest ? "rgba(255, 106, 26,0.08)" : "transparent" }}>
                  {cols.map(([l, k], i) => (
                    <td key={k} style={{ ...td, textAlign: i === 0 ? "left" : "right",
                      color: i === 0 ? (latest ? A.accent : A.textHi) : (k === "gp" ? A.faint : k === "ts" ? A.accent : k === "role" ? A.mut : A.text),
                      fontFamily: i === 0 || k === "role" ? DISPLAY : BODY, fontWeight: i === 0 ? 700 : 600, textTransform: i === 0 || k === "role" ? "uppercase" : "none" }}>
                      {cell(s, k)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================ SECONDARY RENDERS =============================
// Small-multiples: per-metric sparkline + latest-vs-first delta. Multi-season only.
export function ByTheNumbers({ arc }) {
  if (!arc.multiSeason) return null;
  const metrics = [
    { l: "Scoring efficiency", pick: (s) => s.derived.ts, suffix: "%" },
    { l: "Assist-to-turnover", pick: (s) => s.derived.atr },
    { l: "Scoring pace", pick: (s) => s.derived.per36.pts },
    { l: "Prospera grade", pick: (s) => s.eval?.composite ?? null },
  ];
  const Spark = ({ ys }) => {
    const v = ys.filter((y) => y != null); if (v.length < 2) return <div style={{ height: 22 }} />;
    let lo = Math.min(...v), hi = Math.max(...v); if (lo === hi) { lo -= 1; hi += 1; }
    const W = 70, H = 22; const xAt = (i) => (i * W) / (ys.length - 1); const yAt = (y) => H - ((y - lo) / (hi - lo)) * H;
    const d = ys.map((y, i) => y == null ? null : `${i ? "L" : "M"}${xAt(i)},${yAt(y)}`).filter(Boolean).join(" ");
    return <svg viewBox={`0 0 ${W} ${H}`} style={{ width: W, height: H }}><path d={d} fill="none" stroke={A.accent} strokeWidth="2" /></svg>;
  };
  return (
    <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 12, padding: "16px 20px", fontFamily: BODY, color: A.text }}>
      <Eyebrow>By the numbers · what improved</Eyebrow>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 14, marginTop: 12 }}>
        {metrics.map((m) => {
          const ys = arc.seasons.map(m.pick);
          const v = ys.filter((y) => y != null);
          const d = v.length >= 2 ? v[v.length - 1] - v[0] : null;
          return (
            <div key={m.l} style={{ border: `1px solid ${A.border}`, borderRadius: 8, padding: "10px 12px", background: A.inset }}>
              <Label style={{ fontSize: 9 }}>{m.l}</Label>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                <Spark ys={ys} />{deltaChip(d, m.suffix || "")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Compact year-over-year leap (latest vs prev) for tight surfaces (QR preview).
export function YoYLeap({ arc }) {
  if (!arc?.latest) return null;
  const { latest, prev } = arc;
  if (!prev) return (
    <div style={{ fontFamily: BODY, fontSize: 12, color: A.mut }}>First tracked season — {latest.season}.</div>);
  const dTs = latest.derived.ts != null && prev.derived.ts != null ? latest.derived.ts - prev.derived.ts : null;
  const dP = latest.derived.per36.pts != null && prev.derived.per36.pts != null ? latest.derived.per36.pts - prev.derived.per36.pts : null;
  return (
    <div style={{ display: "inline-flex", gap: 14, alignItems: "center", fontFamily: BODY }}>
      <span style={{ fontFamily: DISPLAY, fontSize: 13, fontWeight: 700, textTransform: "uppercase", color: A.mut }}>{prev.season}→{latest.season}</span>
      <span style={{ display: "inline-flex", gap: 5, alignItems: "center", fontSize: 11, color: A.mut }}>Efficiency {deltaChip(dTs, "%")}</span>
      <span style={{ display: "inline-flex", gap: 5, alignItems: "center", fontSize: 11, color: A.mut }}>Pace {deltaChip(dP)}</span>
    </div>
  );
}

// Convenience: the full stacked feature for a profile.
export function DevelopmentSection({ arc, prospect }) {
  if (!arc || !arc.seasons.length) return null;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <DevelopmentArc arc={arc} />
      <ByTheNumbers arc={arc} />
      <GrowthTrack arc={arc} prospect={prospect} />
      <BySeasonTable arc={arc} />
    </div>
  );
}
