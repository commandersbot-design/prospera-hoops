import React from "react";

/**
 * PlayerProfileCard — editorial scouting card for a single DMV prospect.
 *
 * Aesthetic: Prospera Draft HQ "editorial dark" — Fraunces (display serif,
 * italic for the scout snapshot) + JetBrains Mono for everything else, on a
 * near-black canvas with an orange accent. Fonts + the Tabler icon webfont are
 * loaded in src/index.css.
 *
 * Fully data-driven: pass a `player` object (shape below). With no props it
 * renders the default player (Christian Towe) exactly to spec, so it can be
 * dropped on any roster row by mapping a prospect into the same shape.
 *
 *   player = {
 *     name, position, classYear, height, weight, youngForClass,
 *     school, city, state, status, watchlistTier, source, photo, updatedCount,
 *     snapshot,
 *     trajectory: { hsSampleN, summerSampleN, hs:{pts,reb,ast},
 *                   summer:{pts,reb,ast,dPts,dReb,dAst}, note },
 *     scoutView: { firstImpression, swingSkill, watching },
 *     context: { cohortLabel, projected, rows:[{key,detail,percentile,tone}] },
 *     intel: { circuit, district, ageRelClass, frameUpside },
 *   }
 *
 * NOTE on percentiles: per the project's data-integrity rule we never present
 * fabricated evaluations as fact. When `context.projected` is true (the default,
 * because a real peer cohort hasn't been computed yet) the percentile labels are
 * rendered as projections, not measured percentiles, with a caption to match.
 */

// --- Spec design tokens (self-contained; this card has its own palette) ------
const C = {
  bg: "#0a0e16",
  surface: "rgba(255,255,255,0.025)",
  surfaceFaint: "rgba(255,255,255,0.015)",
  border: "rgba(255,255,255,0.06)",
  text: "#e8eaed",
  text2: "#8b94a3",
  text3: "#5a6372",
  faint: "#444f5e",
  accent: "#f0703a",
  cyan: "#54c6e0",
  green: "#9bc459",
  amber: "#c97a3a",
};
const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif";
const MONO = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

const TONE = { normal: C.accent, watch: C.amber, strong: C.green };

// 1-decimal per-game number; em-dash when missing.
const fmt1 = (v) => (v == null || Number.isNaN(v) ? "—" : Number(v).toFixed(1));

const Icon = ({ name, style }) => (
  <i className={`ti ti-${name}`} style={style} aria-hidden="true" />
);

// Mono uppercase section/eyebrow label.
const Label = ({ children, color = C.text3, style }) => (
  <div style={{ fontFamily: MONO, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color, ...style }}>
    {children}
  </div>
);

const Pill = ({ children, color = C.text2, border = C.border, bg = "transparent", icon }) => (
  <span style={{
    fontFamily: MONO, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em",
    color, border: `1px solid ${border}`, background: bg, borderRadius: 6, padding: "4px 9px",
    display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
  }}>
    {icon ? <Icon name={icon} style={{ fontSize: 12 }} /> : null}
    {children}
  </span>
);

// Section wrapper — a top hairline divides every section after the first.
const Section = ({ title, subtitle, first, bg, children }) => (
  <div style={{ padding: "20px 22px", borderTop: first ? "none" : `1px solid ${C.border}`, background: bg || "transparent" }}>
    {title ? (
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <Label>{title}</Label>
        {subtitle ? <span style={{ fontFamily: MONO, fontSize: 11, color: C.faint, letterSpacing: "0.04em" }}>{subtitle}</span> : null}
      </div>
    ) : null}
    {children}
  </div>
);

// --- Header ------------------------------------------------------------------
function PhotoFrame({ photo, source }) {
  return (
    <div style={{
      position: "relative", width: 96, height: 120, flex: "0 0 auto", borderRadius: 8, overflow: "hidden",
      background: "linear-gradient(160deg, rgba(255,255,255,0.05), rgba(0,0,0,0.4))",
      border: `1px solid ${C.accent}55`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {photo ? (
        <>
          <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(0.7) contrast(1.08) brightness(0.95)" }} />
          {/* orange-tinted duotone overlay */}
          <div style={{ position: "absolute", inset: 0, background: C.accent, opacity: 0.14, mixBlendMode: "color" }} />
        </>
      ) : (
        <Icon name="user" style={{ fontSize: 38, color: C.text3 }} />
      )}
      {source ? (
        <div style={{
          position: "absolute", left: 5, bottom: 4, fontFamily: MONO, fontSize: 8, letterSpacing: "0.1em",
          textTransform: "uppercase", color: C.cyan, textShadow: "0 1px 3px rgba(0,0,0,0.9)",
        }}>{source}</div>
      ) : null}
    </div>
  );
}

function Header({ p }) {
  return (
    <Section first>
      <div style={{ borderLeft: `3px solid ${C.accent}`, paddingLeft: 16, marginLeft: -22 + 22, display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <PhotoFrame photo={p.photo} source={p.source} />
          <div style={{ flex: "1 1 auto", minWidth: 0 }}>
            {/* name + watchlist stack */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
              <h2 style={{ fontFamily: SERIF, fontSize: 34, fontWeight: 600, color: "#fff", margin: 0, lineHeight: 1.05 }}>{p.name}</h2>
              {p.watchlistTier ? (
                <div style={{ display: "grid", gap: 4, justifyItems: "end", flex: "0 0 auto" }}>
                  <Pill color={C.cyan} border={`${C.cyan}55`} bg={`${C.cyan}14`} icon="radar">{p.watchlistTier}</Pill>
                  {p.updatedCount ? <span style={{ fontFamily: MONO, fontSize: 10, color: C.faint }}>Updated {p.updatedCount}×</span> : null}
                </div>
              ) : null}
            </div>
            {/* pill row */}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 12 }}>
              {p.position ? <Pill>{p.position}</Pill> : null}
              {p.classYear ? <Pill>Class of {p.classYear}</Pill> : null}
              {(p.height || p.weight) ? <Pill>{[p.height, p.weight].filter(Boolean).join(" · ")}</Pill> : null}
              {p.youngForClass ? <Pill color={C.green} border={`${C.green}55`} bg={`${C.green}12`} icon="arrow-up-right">Young for class</Pill> : null}
            </div>
            {/* meta line */}
            <div style={{ fontFamily: MONO, fontSize: 12, color: C.text2, marginTop: 11, letterSpacing: "0.02em" }}>
              {[p.school, [p.city, p.state].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}
              {p.status ? <> · <span style={{ color: C.accent }}>{p.status}</span></> : null}
            </div>
          </div>
        </div>

        {/* scout snapshot — pending state when no report is authored yet */}
        {p.snapshot ? (
          <div style={{ background: `${C.accent}0d`, border: `1px solid ${C.accent}33`, borderRadius: 8, padding: "12px 14px" }}>
            <Label color={C.accent} style={{ fontSize: 10, marginBottom: 6 }}>Scout snapshot</Label>
            <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 16, lineHeight: 1.45, color: C.text }}>{p.snapshot}</div>
          </div>
        ) : (
          <div style={{ border: `1px dashed ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
            <Label color={C.text3} style={{ fontSize: 10, marginBottom: 6 }}>Scout snapshot</Label>
            <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15, lineHeight: 1.45, color: C.text3 }}>
              Scouting report in progress — the stats below are real where available.
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

// --- Trajectory --------------------------------------------------------------
function StatTile({ label, value, delta, dashed }) {
  return (
    <div style={{
      background: C.surface, border: dashed ? `1px dashed ${C.border}` : `1px solid ${C.border}`,
      borderRadius: 8, padding: "10px 8px", textAlign: "center",
    }}>
      <Label style={{ fontSize: 10 }}>{label}</Label>
      <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: C.text, marginTop: 4, lineHeight: 1 }}>{fmt1(value)}</div>
      {delta != null ? (
        <div style={{ fontFamily: MONO, fontSize: 11, color: C.green, marginTop: 4 }}>{delta >= 0 ? "+" : ""}{delta.toFixed(1)}</div>
      ) : null}
    </div>
  );
}

function TrajBlock({ title, sampleTag, tagColor, tiles, deWeighted }) {
  return (
    <div style={{ opacity: deWeighted ? 0.72 : 1 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 9, flexWrap: "wrap" }}>
        <Label color={C.text2} style={{ fontSize: 10 }}>{title}</Label>
        <span style={{ fontFamily: MONO, fontSize: 10, color: tagColor || C.faint }}>{sampleTag}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
        {tiles.map((t) => <StatTile key={t.label} {...t} dashed={deWeighted} />)}
      </div>
    </div>
  );
}

function Trajectory({ t }) {
  if (!t || (!t.hs && !t.summer)) return null;
  const both = t.hs && t.summer;

  const hsBlock = t.hs ? (
    <TrajBlock
      title="HS Season"
      sampleTag={t.hsSampleN ? `n=${t.hsSampleN}` : ""}
      tiles={[
        { label: "PTS", value: t.hs.pts },
        { label: "REB", value: t.hs.reb },
        { label: "AST", value: t.hs.ast },
      ]}
    />
  ) : null;

  const summerBlock = t.summer ? (
    <TrajBlock
      deWeighted={both}
      title="Summer"
      sampleTag={`${both ? "· " : ""}n=${t.summerSampleN ?? "?"}${(t.summerSampleN ?? 99) <= 2 ? " · small sample" : ""}`}
      tagColor={C.amber}
      tiles={[
        { label: "PTS", value: t.summer.pts, delta: both ? t.summer.dPts : null },
        { label: "REB", value: t.summer.reb, delta: both ? t.summer.dReb : null },
        { label: "AST", value: t.summer.ast, delta: both ? t.summer.dAst : null },
      ]}
    />
  ) : null;

  return (
    <Section title="Trajectory" subtitle={both ? "regular season → summer" : (t.hs ? "high-school season" : "summer · Capitol Hoops")}>
      {both ? (
        <div className="ppc-traj">
          {hsBlock}
          <div className="ppc-traj-arrow" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: C.green }}>
            <Icon name="arrow-right" style={{ fontSize: 22 }} />
          </div>
          {summerBlock}
        </div>
      ) : (hsBlock || summerBlock)}
      {t.note ? (
        <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.5, color: C.text3, marginTop: 14 }}>{t.note}</div>
      ) : null}
    </Section>
  );
}

// --- Scout view --------------------------------------------------------------
function ScoutSlot({ label, color, text }) {
  return (
    <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: 11 }}>
      <Label color={color} style={{ fontSize: 10, marginBottom: 6 }}>{label}</Label>
      <div style={{ fontFamily: MONO, fontSize: 12, lineHeight: 1.55, color: C.text2 }}>{text}</div>
    </div>
  );
}

function ScoutView({ s }) {
  if (!s) return null;
  return (
    <Section title="Scout View" subtitle="in progress">
      <div className="ppc-scout">
        <ScoutSlot label="First impression" color={C.accent} text={s.firstImpression} />
        <ScoutSlot label="Swing skill" color={C.cyan} text={s.swingSkill} />
        <ScoutSlot label="What we're watching" color={C.amber} text={s.watching} />
      </div>
    </Section>
  );
}

// --- Production in context ---------------------------------------------------
function ContextRow({ row, projected }) {
  const color = row.tone === "strong" || row.percentile >= 84 ? C.green : TONE[row.tone] || C.accent;
  const ord = (n) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: C.text2 }}>
          {row.key} · <span style={{ color: C.text }}>{row.detail}</span>
        </span>
        <span style={{ fontFamily: MONO, fontSize: 11, color, fontWeight: 600, whiteSpace: "nowrap" }}>
          {projected ? "~" : ""}{ord(row.percentile)}{projected ? <span style={{ color: C.faint, fontWeight: 400 }}> proj</span> : null}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 6, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, row.percentile))}%`, borderRadius: 6, background: color, opacity: projected ? 0.7 : 1 }} />
      </div>
    </div>
  );
}

function ProductionContext({ c }) {
  if (!c) return null;
  return (
    <Section title="Production in context" subtitle={c.cohortLabel}>
      {c.rows.map((r) => <ContextRow key={r.key} row={r} projected={c.projected} />)}
      {c.projected ? (
        <div style={{ fontFamily: MONO, fontSize: 10, lineHeight: 1.5, color: C.faint, marginTop: 10 }}>
          Projected percentiles — peer cohort not yet computed. Directional estimates, not measured ranks.
        </div>
      ) : null}
    </Section>
  );
}

// --- DMV intel ---------------------------------------------------------------
function IntelPair({ k, v, color }) {
  return (
    <div>
      <Label style={{ fontSize: 10, marginBottom: 5 }}>{k}</Label>
      <div style={{ fontFamily: MONO, fontSize: 12.5, color: color || C.text }}>{v}</div>
    </div>
  );
}

function DmvIntel({ intel }) {
  if (!intel) return null;
  const pairs = [
    { k: "Circuit", v: intel.circuit },
    { k: "District", v: intel.district },
    { k: "Age rel. class", v: intel.ageRelClass, color: C.green },
    { k: "Frame upside", v: intel.frameUpside },
  ].filter((p) => p.v);
  if (!pairs.length) return null;
  return (
    <Section title="DMV Intel" subtitle="proprietary" bg={`${C.cyan}08`}>
      <div className="ppc-intel">
        {pairs.map((p) => <IntelPair key={p.k} k={p.k} v={p.v} color={p.color} />)}
      </div>
    </Section>
  );
}

// --- Default player (renders the spec exactly) -------------------------------
export const DEFAULT_PLAYER = {
  name: "Christian Towe",
  position: "PG",
  classYear: 2029,
  height: "5'10\"",
  weight: "140 lb",
  youngForClass: true,
  school: "Hayfield Secondary",
  city: "Alexandria",
  state: "VA",
  status: "Uncommitted",
  watchlistTier: "DMV Watchlist · Tracking",
  source: "Capitol Hoops",
  photo: null,
  updatedCount: 3,
  snapshot:
    "Undersized lead guard whose summer leap hints the feel is ahead of the box score. Frame and touch are the bet — the production hasn't caught up yet.",
  trajectory: {
    hsSampleN: 26,
    summerSampleN: 1,
    hs: { pts: 10.0, reb: 3.0, ast: 2.6 },
    summer: { pts: 22.0, reb: 8.0, ast: 3.0, dPts: 12.0, dReb: 5.0, dAst: 0.4 },
    note: "One Capitol Hoops outing — directional, not predictive. Flagged for follow-up viewing before weighting.",
  },
  scoutView: {
    firstImpression: "Pace and poise with the ball. Sees the next pass before it's there.",
    swingSkill: "Perimeter shot. 66% FT touch says the 25% from three should climb.",
    watching: "Does the frame fill out? 140 lb guard needs strength to hold up.",
  },
  context: {
    cohortLabel: "vs class-of-2029 PG, conference",
    projected: true,
    rows: [
      { key: "Scoring", detail: "10.0 PPG", percentile: 68, tone: "normal" },
      { key: "Playmaking", detail: "2.6 APG", percentile: 71, tone: "normal" },
      { key: "Perimeter shot", detail: "25.0 3P%", percentile: 31, tone: "watch" },
      { key: "Event steals", detail: "2.0 SPG", percentile: 84, tone: "strong" },
    ],
  },
  intel: {
    circuit: "Hawks (Hayfield)",
    district: "Patriot · 6A North",
    ageRelClass: "Born Mar '11 · young",
    frameUpside: "High · room to add",
  },
};

const RESPONSIVE_CSS = `
.ppc-traj { display: grid; grid-template-columns: 1fr 44px 1fr; align-items: center; gap: 8px; }
.ppc-scout { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 16px; }
.ppc-intel { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; }
@media (max-width: 560px) {
  .ppc-traj { grid-template-columns: 1fr; }
  .ppc-traj-arrow { transform: rotate(90deg); padding: 4px 0; }
}
`;

export default function PlayerProfileCard({ player = DEFAULT_PLAYER }) {
  const p = player;
  return (
    <div style={{
      maxWidth: 680, margin: "0 auto", background: C.bg, color: C.text,
      border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden",
      fontFamily: MONO,
    }}>
      <style>{RESPONSIVE_CSS}</style>
      <Header p={p} />
      <Trajectory t={p.trajectory} />
      <ScoutView s={p.scoutView} />
      <ProductionContext c={p.context} />
      <DmvIntel intel={p.intel} />
    </div>
  );
}
