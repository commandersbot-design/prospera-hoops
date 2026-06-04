import React, { useState, useMemo } from "react";

/**
 * Scouting Workspace — the shared two-pane shell behind both the Schools and
 * Summer League sections. Re-skinned to the "A1 Graphite" soft-dark theme with
 * a gold elite-tier accent.
 *
 * Built in three layers (see the original spec):
 *   0) Foundation — A1 tokens, the single gold-tier config, and two reusable
 *      components: <WorkspaceShell> (layout) and <RosterTable> (stats|board).
 *   1) <SchoolsSection>      — WorkspaceShell + RosterTable mode="board".
 *   2) <SummerLeagueSection> — WorkspaceShell + RosterTable mode="stats", with
 *      an internal Players | Teams | Schedule toggle (default = Players).
 *
 * Data-driven throughout. Right now it renders the spec's SEED data so it stands
 * up immediately; swap the SEED_* objects for adapters over the real
 * CH_TEAMS / SCHOOLS / PROSPECTS stores when wiring to live data.
 *
 * Typography per spec: Fraunces for names/numbers/headings, JetBrains Mono for
 * labels/data. Icons via the Tabler webfont (loaded in src/index.css).
 */

// --- A1 Graphite tokens (self-contained, mirrors PlayerProfileCard's pattern) -
const A = {
  bg: "#1d1e22",
  surface: "#26282d",
  inset: "#1d1e22",
  border: "#383a40",
  text: "#ececec",
  textHi: "#f6f6f4",
  textMut: "#9a9ca2",
  textFaint: "#6e7178",
  accent: "#e87a3c",   // orange — the workhorse
  accent2: "#6fae9b",  // sage — secondary
  info: "#54c6e0",     // eyebrows only
  goldGradient: "linear-gradient(135deg, #f1e3a8 0%, #d2af52 55%, #a9842f 100%)",
  goldSolid: "#d2af52",
  goldOn: "#2a2410",
  goldSheen: "inset 0 1px 0 rgba(255,255,255,0.45)",
  goldTint: "rgba(210,175,82,0.05)",
  amber: "#c9a14a",    // small-sample GP warning
  chipNeutralBorder: "#5a5d64",
  chipNeutralBg: "rgba(255,255,255,0.04)",
};
const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif";
const MONO = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

// --- Gold-tier config — the SINGLE source that drives every gold element ------
// Gold tier = a VERIFIED high-major D1 recruiting status (a high-major offer or
// commitment). It's a fact, not an opinion, so it auto-populates from recruiting
// data and never sits empty. Change the definition here only; keep it to ONE top
// tier — a second gold tier destroys the signal.
// (We are not running a Big Board right now, so board rank no longer drives gold.)
const isGoldTier = (p) => !!(p && p.highMajor);
const GOLD_TIER_LABEL = "Gold Tier";

// --- tiny primitives ----------------------------------------------------------
const Icon = ({ name, style }) => <i className={`ti ti-${name}`} style={style} aria-hidden="true" />;

const Label = ({ children, color = A.textMut, style }) => (
  <div style={{ fontFamily: MONO, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color, ...style }}>
    {children}
  </div>
);

const Eyebrow = ({ children }) => (
  <div style={{ fontFamily: MONO, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.16em", color: A.info, fontWeight: 600 }}>
    {children}
  </div>
);

// Gold tier badge — rule 1: filled gold pill, dark text, crown, sheen.
const TierBadge = ({ label = GOLD_TIER_LABEL, compact }) => (
  <span style={{
    fontFamily: MONO, fontSize: compact ? 9.5 : 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
    color: A.goldOn, background: A.goldGradient, boxShadow: A.goldSheen, borderRadius: 5,
    padding: compact ? "2px 6px" : "3px 8px", display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
  }}>
    <Icon name="crown" style={{ fontSize: compact ? 10 : 11 }} />{label}
  </span>
);

// Orange tracked pip "●N" and gold elite pip "◆N" — sit side by side (rule 3).
const TrackedPip = ({ n }) => (
  <span style={{ fontFamily: MONO, fontSize: 11, color: A.accent, fontWeight: 600, whiteSpace: "nowrap" }}>● {n}</span>
);
const ElitePip = ({ n }) => (
  <span style={{ fontFamily: MONO, fontSize: 11, color: A.goldSolid, fontWeight: 600, whiteSpace: "nowrap" }}>◆ {n}</span>
);

// Toggle chip. tone: "neutral" | "tracked" (orange) | "gold".
function Chip({ active, tone = "neutral", icon, children, onClick }) {
  let style = { border: `1px solid ${A.border}`, background: "transparent", color: A.textMut };
  if (active && tone === "neutral") style = { border: `1px solid ${A.chipNeutralBorder}`, background: A.chipNeutralBg, color: A.textHi };
  if (active && tone === "tracked") style = { border: `1px solid ${A.accent}`, background: "rgba(232,122,60,0.14)", color: A.accent };
  if (active && tone === "gold") style = { border: "1px solid transparent", background: A.goldGradient, color: A.goldOn, boxShadow: A.goldSheen };
  return (
    <button type="button" onClick={onClick} style={{
      fontFamily: MONO, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600,
      borderRadius: 6, padding: "5px 9px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
      ...style,
    }}>
      {icon ? <Icon name={icon} style={{ fontSize: 12 }} /> : null}{children}
    </button>
  );
}

function FacetGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <Label style={{ fontSize: 10, marginBottom: 7, color: A.textFaint }}>{label}</Label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{children}</div>
    </div>
  );
}

// --- COMPONENT 1 · WorkspaceShell --------------------------------------------
// Two panes under a top bar. Left rail (rail) is fixed ~236px and OWNS its own
// scroll; filter state lives in the caller, so selecting a row never resets the
// facets. Right pane renders caller-supplied detail.
const SHELL_CSS = `
.a1ws { background: ${A.bg}; color: ${A.text}; border: 1px solid ${A.border}; border-radius: 12px; overflow: hidden; }
.a1ws-panes { display: grid; grid-template-columns: 236px 1fr; align-items: stretch; }
.a1ws-rail { border-right: 1px solid ${A.border}; padding: 16px; max-height: 78vh; overflow: auto; }
.a1ws-detail { padding: 18px 20px; min-width: 0; max-height: 78vh; overflow: auto; }
.a1ws-row { cursor: pointer; }
.a1ws-row:hover { background: rgba(255,255,255,0.03); }
.a1ws th { cursor: pointer; user-select: none; }
.a1ws-scroll::-webkit-scrollbar { width: 9px; height: 9px; }
.a1ws-scroll::-webkit-scrollbar-thumb { background: ${A.border}; border-radius: 6px; }
@media (max-width: 560px) {
  .a1ws-panes { grid-template-columns: 1fr; }
  .a1ws-rail { border-right: none; border-bottom: 1px solid ${A.border}; max-height: none; }
  .a1ws-detail { max-height: none; }
}
`;

function WorkspaceShell({ eyebrow, subline, topRight, rail, children }) {
  return (
    <div className="a1ws">
      <style>{SHELL_CSS}</style>
      {/* top bar */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${A.border}`, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 auto", minWidth: 0 }}>
          <Eyebrow>{eyebrow}</Eyebrow>
          {subline ? <div style={{ fontFamily: MONO, fontSize: 12, color: A.textMut, marginTop: 5 }}>{subline}</div> : null}
        </div>
        {topRight ? <div style={{ flex: "0 0 auto" }}>{topRight}</div> : null}
      </div>
      {/* panes — full-width detail when there's no rail (e.g. Players/Schedule) */}
      {rail ? (
        <div className="a1ws-panes">
          <aside className="a1ws-rail a1ws-scroll">{rail}</aside>
          <section className="a1ws-detail a1ws-scroll">{children}</section>
        </div>
      ) : (
        <section className="a1ws-detail a1ws-scroll">{children}</section>
      )}
    </div>
  );
}

// Segmented toggle used in the Summer top bar.
function Segmented({ value, onChange, options }) {
  return (
    <div style={{ display: "inline-flex", border: `1px solid ${A.border}`, borderRadius: 8, overflow: "hidden" }}>
      {options.map(([val, label]) => {
        const on = value === val;
        return (
          <button key={val} type="button" onClick={() => onChange(val)} style={{
            fontFamily: MONO, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600,
            padding: "7px 13px", border: "none", cursor: "pointer",
            background: on ? A.accent : "transparent", color: on ? "#fff" : A.textMut,
          }}>{label}</button>
        );
      })}
    </div>
  );
}

// --- COMPONENT 2 · RosterTable (mode="stats" | "board") ----------------------
// Reused on team / school / summer pages.
function PlayerCell({ p }) {
  const gold = isGoldTier(p);
  return (
    <div style={{ minWidth: 0 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600, color: p.tracked ? A.accent : A.textHi }}>
          {p.tracked ? "● " : ""}{p.name}
        </span>
        {gold ? <TierBadge compact /> : null}
      </span>
      <div style={{ fontFamily: MONO, fontSize: 10.5, color: A.textMut, letterSpacing: "0.04em", marginTop: 2 }}>
        {[p.pos, p.class ? `'${String(p.class).replace(/^'/, "")}` : null].filter(Boolean).join(" · ")}
      </div>
    </div>
  );
}

const TH = ({ children, active, dir, onClick, right }) => (
  <th onClick={onClick} style={{
    fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em",
    color: active ? A.accent : A.textMut, textAlign: right ? "right" : "left",
    padding: "8px 10px", borderBottom: `1px solid ${A.border}`, whiteSpace: "nowrap", fontWeight: 600,
  }}>
    {children}{active ? <span style={{ color: A.accent }}>{dir === "asc" ? " ↑" : " ↓"}</span> : ""}
  </th>
);

// Recruiting status cell — commitment > high-major offers > nothing. Gold-tier
// players (high-major) read in gold-solid; commitments and everything else stay
// orange/faint (gold is identity, not function).
function RecruitingStatus({ p }) {
  if (p.commit) return <span style={{ fontFamily: MONO, fontSize: 11.5, color: A.accent, fontWeight: 600 }}>→ {p.commit}</span>;
  if (isGoldTier(p)) return <span style={{ fontFamily: MONO, fontSize: 11.5, color: A.goldSolid, fontWeight: 600 }}>High-major</span>;
  return <span style={{ fontFamily: MONO, fontSize: 12, color: A.textFaint }}>—</span>;
}

export function RosterTable({ players, mode = "stats" }) {
  const [sortKey, setSortKey] = useState("pts");
  const [dir, setDir] = useState("desc");

  const onSort = (k) => {
    if (k === sortKey) setDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(k); setDir("desc"); }
  };

  const rows = useMemo(() => {
    const list = [...players];
    if (mode === "recruiting") {
      // Recruiting status, most-notable first: gold (high-major) → committed →
      // tracked → the rest; ties broken A–Z.
      const score = (p) => (isGoldTier(p) ? 0 : p.commit ? 1 : p.tracked ? 2 : 3);
      return list.sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name));
    }
    const m = dir === "desc" ? -1 : 1;
    return list.sort((a, b) => ((a[sortKey] ?? -Infinity) - (b[sortKey] ?? -Infinity)) * m);
  }, [players, mode, sortKey, dir]);

  // gold row band — rule 2
  const rowStyle = (p) => isGoldTier(p)
    ? { background: A.goldTint, borderLeft: `2px solid ${A.goldSolid}` }
    : { borderLeft: "2px solid transparent" };

  if (mode === "recruiting") {
    return (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>
          <TH>#</TH><TH>Player</TH><TH right>Recruiting</TH>
        </tr></thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={p.name} className="a1ws-row" style={{ ...rowStyle(p), borderBottom: `1px solid ${A.border}` }}>
              <td style={{ padding: "9px 10px", fontFamily: MONO, fontSize: 12, color: A.textFaint, width: 36 }}>{i + 1}</td>
              <td style={{ padding: "9px 10px" }}><PlayerCell p={p} /></td>
              <td style={{ padding: "9px 10px", textAlign: "right" }}><RecruitingStatus p={p} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // mode === "stats"
  const numCell = (v, low, isGp) => (
    <td style={{
      padding: "9px 10px", textAlign: "right", fontFamily: SERIF, fontSize: 15,
      color: isGp ? (low ? A.amber : A.text) : A.text, fontWeight: 600,
    }}>{v == null ? "—" : (isGp ? v : Number(v).toFixed(1))}</td>
  );
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead><tr>
        <TH>Player</TH>
        <TH right active={sortKey === "gp"} dir={dir} onClick={() => onSort("gp")}>GP</TH>
        <TH right active={sortKey === "pts"} dir={dir} onClick={() => onSort("pts")}>PTS</TH>
        <TH right active={sortKey === "reb"} dir={dir} onClick={() => onSort("reb")}>REB</TH>
        <TH right active={sortKey === "ast"} dir={dir} onClick={() => onSort("ast")}>AST</TH>
      </tr></thead>
      <tbody>
        {rows.map((p) => {
          const low = (p.gp ?? 0) < 2; // small-sample discipline
          return (
            <tr key={p.name} className="a1ws-row" style={{ ...rowStyle(p), borderBottom: `1px solid ${A.border}`, opacity: low ? 0.62 : 1 }}>
              <td style={{ padding: "9px 10px" }}><PlayerCell p={p} /></td>
              {numCell(p.gp, low, true)}
              {numCell(p.pts, low)}
              {numCell(p.reb, low)}
              {numCell(p.ast, low)}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// Section header used inside the right pane.
function ZoneTitle({ children, right }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
      <Label style={{ color: A.textMut }}>{children}</Label>
      {right ? <span style={{ fontFamily: MONO, fontSize: 11, color: A.textMut }}>{right}</span> : null}
    </div>
  );
}

// =============================================================================
// SEED DATA — replace with adapters over the real stores when wiring live data.
// =============================================================================

// Summer League teams + rosters (stats mode). highMajor=true marks a verified
// high-major D1 offer/commit (→ gold tier); commit names the school when known.
const SEED_SUMMER_TEAMS = [
  { name: "DeMatha", conf: "WCAC", region: "MD", gp: 6, coach: "Mike G. Jones III", roster: [
    { name: "A. Whitfield", pos: "SF", class: "27", gp: 6, pts: 18.2, reb: 6.1, ast: 2.4, tracked: true},
    { name: "M. Okafor", pos: "C", class: "28", gp: 6, pts: 11.0, reb: 9.3, ast: 1.1, tracked: true},
    { name: "J. Ellis", pos: "PG", class: "27", gp: 6, pts: 14.5, reb: 3.0, ast: 5.2 },
    { name: "D. Carter", pos: "SG", class: "29", gp: 5, pts: 9.8, reb: 2.1, ast: 1.4 },
    { name: "R. Banks", pos: "PF", class: "28", gp: 6, pts: 7.2, reb: 5.5, ast: 0.8 },
  ] },
  { name: "Hawks (Hayfield)", conf: "Public", region: "NoVA", gp: 4, coach: "Carlos Poindexter", roster: [
    { name: "Christian Towe", pos: "PG", class: "29", gp: 1, pts: 22.0, reb: 8.0, ast: 3.0, tracked: true },
    { name: "K. Reyes", pos: "SG", class: "28", gp: 4, pts: 13.4, reb: 3.2, ast: 2.0 },
    { name: "T. Diallo", pos: "PF", class: "27", gp: 4, pts: 10.1, reb: 7.0, ast: 1.2 },
    { name: "B. Cho", pos: "C", class: "29", gp: 3, pts: 6.0, reb: 5.1, ast: 0.4 },
  ] },
  { name: "Gonzaga", conf: "WCAC", region: "DC", gp: 5, coach: "Keith Urgo", roster: [
    { name: "R. Maddox", pos: "PG", class: "27", gp: 5, pts: 16.0, reb: 3.4, ast: 6.1, tracked: true },
    { name: "S. Bell", pos: "SF", class: "28", gp: 5, pts: 12.2, reb: 5.0, ast: 2.0 },
    { name: "P. Nwosu", pos: "C", class: "29", gp: 4, pts: 8.5, reb: 8.0, ast: 0.9 },
  ] },
  { name: "St. John's DC", conf: "WCAC", region: "DC", gp: 3, coach: "—", roster: [
    { name: "Drew Hill", pos: "SG", class: "27", gp: 3, pts: 31.5, reb: 4.0, ast: 3.2, highMajor: true, commit: "Kansas", tracked: true },
    { name: "L. Park", pos: "PF", class: "28", gp: 3, pts: 9.0, reb: 6.2, ast: 1.0 },
  ] },
  { name: "Paul VI", conf: "WCAC", region: "NoVA", gp: 5, coach: "—", roster: [
    { name: "C. Adeyemi", pos: "SF", class: "27", gp: 5, pts: 17.3, reb: 6.6, ast: 2.1, tracked: true },
    { name: "V. Russo", pos: "PG", class: "29", gp: 5, pts: 11.0, reb: 2.4, ast: 4.8 },
  ] },
  { name: "Good Counsel", conf: "WCAC", region: "MD", gp: 4, coach: "GJ Kissal", roster: [
    { name: "H. Stein", pos: "SG", class: "28", gp: 4, pts: 13.0, reb: 3.0, ast: 2.2 },
    { name: "O. Mensah", pos: "C", class: "27", gp: 4, pts: 10.4, reb: 8.1, ast: 0.6 },
  ] },
  { name: "Bullis", conf: "IND", region: "MD", gp: 3, coach: "Bruce Kelley", roster: [
    { name: "F. Lowe", pos: "PG", class: "29", gp: 3, pts: 12.5, reb: 2.0, ast: 5.0 },
    { name: "G. Tran", pos: "SF", class: "28", gp: 3, pts: 9.2, reb: 4.0, ast: 1.5 },
  ] },
  { name: "Boys' Latin", conf: "MIAA", region: "MD", gp: 4, coach: "Dominic Milburn", roster: [
    { name: "W. Pace", pos: "PF", class: "27", gp: 4, pts: 14.0, reb: 7.5, ast: 1.0 },
    { name: "A. Cruz", pos: "PG", class: "30", gp: 4, pts: 8.0, reb: 2.2, ast: 3.4 },
  ] },
];

// Schools + rosters (board mode). Non-notable schools keep small plain rosters
// so most directory rows stay badge-less — that contrast is the point.
const SEED_SCHOOLS = [
  { name: "DeMatha Catholic", conf: "WCAC", county: "Prince George's", st: "MD", players: 18, coach: "Mike G. Jones III", roster: [
    { name: "J. Marshall", pos: "SF", class: "26", highMajor: true, commit: "Maryland", tracked: true },
    { name: "A. Whitfield", pos: "SF", class: "27", tracked: true},
    { name: "M. Okafor", pos: "C", class: "28", tracked: true},
    { name: "J. Ellis", pos: "PG", class: "27" },
    { name: "D. Carter", pos: "SG", class: "29" },
    { name: "R. Banks", pos: "PF", class: "28" },
  ] },
  { name: "Gonzaga College HS", conf: "WCAC", county: "Washington", st: "DC", players: 20, coach: "Keith Urgo", roster: [
    { name: "T. Bennett", pos: "PG", class: "26", highMajor: true, commit: "Georgetown", tracked: true },
    { name: "R. Maddox", pos: "PG", class: "27", tracked: true },
    { name: "S. Bell", pos: "SF", class: "28" },
    { name: "P. Nwosu", pos: "C", class: "29" },
  ] },
  { name: "Paul VI", conf: "WCAC", county: "Fairfax", st: "VA", players: 16, coach: "—", roster: [
    { name: "C. Adeyemi", pos: "SF", class: "27", tracked: true },
    { name: "V. Russo", pos: "PG", class: "29" },
  ] },
  { name: "Bullis School", conf: "IND", county: "Montgomery", st: "MD", players: 15, coach: "Bruce Kelley", roster: [
    { name: "F. Lowe", pos: "PG", class: "29" },
    { name: "G. Tran", pos: "SF", class: "28" },
  ] },
  { name: "Forest Park HS", conf: "Public", county: "Prince William", st: "VA", players: 21, coach: "Mak Dogbatse", roster: [
    { name: "E. Santos", pos: "SG", class: "28" },
    { name: "D. Pierre", pos: "PF", class: "27" },
  ] },
  { name: "Loyola Blakefield", conf: "MIAA", county: "Baltimore", st: "MD", players: 21, coach: "Roger Garfield", roster: [
    { name: "C. Walsh", pos: "PG", class: "28" },
    { name: "M. Doyle", pos: "C", class: "27" },
  ] },
  { name: "The Potomac School", conf: "IND", county: "Fairfax", st: "VA", players: 22, coach: "Jeremy Myers", roster: [
    { name: "A. Klein", pos: "SF", class: "29" },
    { name: "R. Vance", pos: "SG", class: "28" },
  ] },
];

// =============================================================================
// SHARED helpers for badges/counts
// =============================================================================
const countTracked = (roster) => roster.filter((p) => p.tracked).length;
const countElite = (roster) => roster.filter(isGoldTier).length;

// Watchlist module — global, ignores rail filters (fork b: default).
function Watchlist({ teams }) {
  const tracked = useMemo(() => {
    const out = [];
    for (const t of teams) for (const p of t.roster) if (p.tracked) out.push({ ...p, team: t.name });
    return out.sort((a, b) => (b.pts ?? 0) - (a.pts ?? 0)).slice(0, 3);
  }, [teams]);
  return (
    <div style={{ background: "rgba(232,122,60,0.06)", border: `1px solid rgba(232,122,60,0.28)`, borderRadius: 10, padding: "14px 16px", marginBottom: 18 }}>
      <ZoneTitle right="across all teams">My guys this summer</ZoneTitle>
      <div style={{ display: "grid", gap: 9 }}>
        {tracked.map((p) => {
          const low = (p.gp ?? 0) < 2;
          return (
            <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10, opacity: low ? 0.62 : 1 }}>
              <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600, color: A.accent, flex: "0 0 auto" }}>{p.name}</span>
              {isGoldTier(p) ? <TierBadge compact /> : null}
              <span style={{ fontFamily: MONO, fontSize: 11, color: A.textMut, flex: "1 1 auto", minWidth: 0 }}>{p.team}</span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: low ? A.amber : A.textFaint, whiteSpace: "nowrap" }}>
                {p.gp} GP{low ? " · small" : ""}
              </span>
              <span style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: A.textHi, whiteSpace: "nowrap" }}>{Number(p.pts).toFixed(1)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Generic facet toggle-set state helper: a Set of active values per group.
function useFacet(all) {
  const [on, setOn] = useState(new Set(all)); // all-on = no filter
  const toggle = (v) => setOn((prev) => {
    const next = new Set(prev);
    next.has(v) ? next.delete(v) : next.add(v);
    return next;
  });
  // A facet filters only when it's a strict, non-empty subset.
  const filters = on.size > 0 && on.size < all.length;
  const pass = (v) => !filters || on.has(v);
  return { on, toggle, pass };
}

// =============================================================================
// 2 · SUMMER LEAGUE SECTION
// =============================================================================
const REGIONS = ["DC", "MD", "NoVA"];
const LEAGUES = ["WCAC", "MIAA", "Public", "IND"];
const CLASSES = ["27", "28", "29", "30"];

export function SummerLeagueSection() {
  const [tab, setTab] = useState("players"); // DEFAULT LANDING = Players

  // Teams-workspace state lives here (above the shell) so filters persist across
  // team selection and tab switches.
  const region = useFacet(REGIONS);
  const league = useFacet(LEAGUES);
  const klass = useFacet(CLASSES);
  const [trackedOnly, setTrackedOnly] = useState(false);
  const [goldOnly, setGoldOnly] = useState(false);
  const [selected, setSelected] = useState("DeMatha");

  // Fork (a): the Class facet keeps a team if ANY roster player matches a
  // selected class (team-level) — the default. (Alternative: filter roster ROWS.)
  const teams = useMemo(() => SEED_SUMMER_TEAMS.filter((t) => {
    if (!region.pass(t.region)) return false;
    if (!league.pass(t.conf)) return false;
    if (!klass.pass("__all__") && !t.roster.some((p) => klass.on.has(String(p.class)))) return false;
    if (trackedOnly && countTracked(t.roster) === 0) return false;
    if (goldOnly && countElite(t.roster) === 0) return false;
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name)), [region, league, klass, trackedOnly, goldOnly]);

  const team = teams.find((t) => t.name === selected) || teams[0] || null;

  const rail = (
    <div>
      <FacetGroup label="Region">{REGIONS.map((r) => <Chip key={r} active={region.on.has(r)} onClick={() => region.toggle(r)}>{r}</Chip>)}</FacetGroup>
      <FacetGroup label="League">{LEAGUES.map((l) => <Chip key={l} active={league.on.has(l)} onClick={() => league.toggle(l)}>{l}</Chip>)}</FacetGroup>
      <FacetGroup label="Class">{CLASSES.map((c) => <Chip key={c} active={klass.on.has(c)} onClick={() => klass.toggle(c)}>'{c}</Chip>)}</FacetGroup>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "4px 0 14px" }}>
        <Chip tone="tracked" icon="star" active={trackedOnly} onClick={() => setTrackedOnly((v) => !v)}>My tracked only</Chip>
        <Chip tone="gold" icon="crown" active={goldOnly} onClick={() => setGoldOnly((v) => !v)}>{GOLD_TIER_LABEL}</Chip>
      </div>
      <Label style={{ color: A.textFaint, marginBottom: 8 }}>{teams.length} teams</Label>
      <div style={{ display: "grid", gap: 2 }}>
        {teams.map((t) => {
          const on = team && t.name === team.name;
          const nT = countTracked(t.roster), nE = countElite(t.roster);
          return (
            <button key={t.name} type="button" className="a1ws-row" onClick={() => setSelected(t.name)} style={{
              display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", textAlign: "left",
              padding: "8px 10px", borderRadius: 8, cursor: "pointer",
              background: on ? "rgba(232,122,60,0.12)" : "transparent",
              border: `1px solid ${on ? A.accent : "transparent"}`,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: SERIF, fontSize: 13, fontWeight: 600, color: A.textHi, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: A.textFaint, letterSpacing: "0.04em", marginTop: 2 }}>{t.conf} · {t.region} · {t.gp}gp</div>
              </div>
              <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                {nE > 0 ? <ElitePip n={nE} /> : null}
                {nT > 0 ? <TrackedPip n={nT} /> : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const teamsDetail = (
    <div>
      <Watchlist teams={SEED_SUMMER_TEAMS} />
      {team ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600, color: A.textHi, margin: 0 }}>{team.name}</h2>
            {countElite(team.roster) > 0 ? <ElitePip n={`${countElite(team.roster)} elite`} /> : null}
            {countTracked(team.roster) > 0 ? <TrackedPip n={`${countTracked(team.roster)} tracked`} /> : null}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11.5, color: A.textMut, margin: "7px 0 16px", letterSpacing: "0.03em" }}>
            {team.conf} · {team.region} · {team.gp} games · {team.coach || "—"}
          </div>
          <RosterTable players={team.roster} mode="stats" />
        </div>
      ) : <Empty>No teams match these filters.</Empty>}
    </div>
  );

  return (
    <WorkspaceShell
      eyebrow="Capitol Hoops Summer League · 2026"
      subline={tab === "teams" ? "Two-pane scouting workspace · filters persist across selection"
        : tab === "players" ? "DMV scoring leaders + your watchlist · games played leads every line"
        : "Chronological games feed · results and upcoming"}
      topRight={<Segmented value={tab} onChange={setTab} options={[["players", "Players"], ["teams", "Teams"], ["schedule", "Schedule"]]} />}
      rail={tab === "teams" ? rail : null}
    >
      {tab === "teams" ? teamsDetail : tab === "players" ? <SummerPlayers /> : <SummerSchedule />}
    </WorkspaceShell>
  );
}

function SummerPlayers() {
  // Leaderboard across all teams, GP-gated (GP<2 dimmed). Plus the watchlist.
  const all = useMemo(() => {
    const out = [];
    for (const t of SEED_SUMMER_TEAMS) for (const p of t.roster) out.push({ ...p, team: t.name });
    return out.sort((a, b) => (b.pts ?? 0) - (a.pts ?? 0));
  }, []);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 20 }} className="a1ws-players">
      <style>{`@media (max-width:560px){.a1ws-players{grid-template-columns:1fr !important;}}`}</style>
      <div>
        <ZoneTitle right={`${all.length} players`}>Scoring leaders</ZoneTitle>
        <div style={{ display: "grid", gap: 2 }}>
          {all.map((p, i) => {
            const low = (p.gp ?? 0) < 2;
            return (
              <div key={p.name + p.team} className="a1ws-row" style={{ display: "grid", gridTemplateColumns: "26px 1fr auto auto", gap: 12, alignItems: "center", padding: "8px 10px", borderRadius: 8, ...(isGoldTier(p) ? { background: A.goldTint, borderLeft: `2px solid ${A.goldSolid}` } : { borderLeft: "2px solid transparent" }), opacity: low ? 0.62 : 1 }}>
                <span style={{ fontFamily: MONO, fontSize: 12, color: i === 0 ? A.accent : A.textFaint, fontWeight: i === 0 ? 700 : 400 }}>{i + 1}</span>
                <div style={{ minWidth: 0 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600, color: p.tracked ? A.accent : A.textHi }}>{p.tracked ? "● " : ""}{p.name}</span>
                    {isGoldTier(p) ? <TierBadge compact /> : null}
                  </span>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: A.textMut, marginTop: 2 }}>{p.team} · {p.pos} · '{p.class}</div>
                </div>
                <span style={{ fontFamily: MONO, fontSize: 10, color: low ? A.amber : A.textFaint, whiteSpace: "nowrap" }}>{p.gp} GP{low ? " · small" : ""}</span>
                <span style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: A.textHi, whiteSpace: "nowrap" }}>{Number(p.pts).toFixed(1)}</span>
              </div>
            );
          })}
        </div>
      </div>
      <Watchlist teams={SEED_SUMMER_TEAMS} />
    </div>
  );
}

// Tiny seed schedule so the feed renders; wire to schedule.json later.
const SEED_GAMES = [
  { date: "May 31", home: "Hawks (Hayfield)", away: "Gonzaga", hs: 64, as: 61, status: "final" },
  { date: "May 31", home: "DeMatha", away: "Good Counsel", hs: 78, as: 55, status: "final" },
  { date: "Jun 1", home: "St. John's DC", away: "Paul VI", hs: 70, as: 66, status: "final" },
  { date: "Jun 6", home: "Bullis", away: "Boys' Latin", time: "3:45 pm", status: "scheduled" },
  { date: "Jun 6", home: "DeMatha", away: "Gonzaga", time: "6:15 pm", status: "scheduled" },
];
function SummerSchedule() {
  return (
    <div>
      <ZoneTitle right={`${SEED_GAMES.length} games`}>Games feed</ZoneTitle>
      <div style={{ display: "grid", gap: 8 }}>
        {SEED_GAMES.map((g, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "64px 1fr auto", gap: 12, alignItems: "center", padding: "10px 12px", background: A.surface, border: `1px solid ${A.border}`, borderRadius: 10 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: A.textMut, letterSpacing: "0.06em" }}>{g.date}</span>
            <span style={{ fontFamily: SERIF, fontSize: 14, color: A.textHi }}>{g.home} <span style={{ color: A.textFaint, fontFamily: MONO, fontSize: 11 }}>vs</span> {g.away}</span>
            {g.status === "final"
              ? <span style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: A.text, whiteSpace: "nowrap" }}>{g.hs}<span style={{ color: A.textFaint }}>–</span>{g.as}</span>
              : <span style={{ fontFamily: MONO, fontSize: 12, color: A.accent, fontWeight: 600, whiteSpace: "nowrap" }}>{g.time}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty({ children }) {
  return <div style={{ fontFamily: MONO, fontSize: 12, color: A.textFaint, padding: 24, textAlign: "center" }}>{children}</div>;
}

// =============================================================================
// 1 · SCHOOLS SECTION
// =============================================================================
const STATES = ["DC", "MD", "VA"];
const SORTS = [["az", "A–Z"], ["prospects", "# prospects"], ["tracked", "# tracked"]];

export function SchoolsSection() {
  const state = useFacet(STATES);
  const [hasTracked, setHasTracked] = useState(false);
  const [goldOnly, setGoldOnly] = useState(false);
  const [sort, setSort] = useState("az");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState("DeMatha Catholic");

  const schools = useMemo(() => {
    const k = q.trim().toLowerCase();
    let list = SEED_SCHOOLS.filter((s) => {
      if (!state.pass(s.st)) return false;
      if (hasTracked && countTracked(s.roster) === 0) return false;
      if (goldOnly && countElite(s.roster) === 0) return false;
      if (k && !`${s.name} ${s.coach} ${s.county}`.toLowerCase().includes(k)) return false;
      return true;
    });
    if (sort === "az") list = list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "prospects") list = list.sort((a, b) => b.players - a.players);
    else list = list.sort((a, b) => countTracked(b.roster) - countTracked(a.roster));
    return list;
  }, [state, hasTracked, goldOnly, sort, q]);

  const school = schools.find((s) => s.name === selected) || schools[0] || null;

  const rail = (
    <div>
      <FacetGroup label="State">{STATES.map((s) => <Chip key={s} active={state.on.has(s)} onClick={() => state.toggle(s)}>{s}</Chip>)}</FacetGroup>
      <FacetGroup label="Signal">
        <Chip tone="tracked" icon="circle-filled" active={hasTracked} onClick={() => setHasTracked((v) => !v)}>Has tracked</Chip>
        <Chip tone="gold" icon="crown" active={goldOnly} onClick={() => setGoldOnly((v) => !v)}>{GOLD_TIER_LABEL}</Chip>
      </FacetGroup>
      <FacetGroup label="Sort">{SORTS.map(([v, l]) => <Chip key={v} active={sort === v} onClick={() => setSort(v)}>{l}</Chip>)}</FacetGroup>
      <Label style={{ color: A.textFaint, marginBottom: 8 }}>{schools.length} schools</Label>
      <div style={{ display: "grid", gap: 2 }}>
        {schools.map((s) => {
          const on = school && s.name === school.name;
          const nT = countTracked(s.roster), nE = countElite(s.roster);
          return (
            <button key={s.name} type="button" className="a1ws-row" onClick={() => setSelected(s.name)} style={{
              display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", textAlign: "left",
              padding: "8px 10px", borderRadius: 8, cursor: "pointer",
              background: on ? "rgba(232,122,60,0.12)" : "transparent",
              border: `1px solid ${on ? A.accent : "transparent"}`,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: SERIF, fontSize: 13, fontWeight: 600, color: A.textHi, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: A.textFaint, letterSpacing: "0.04em", marginTop: 2 }}>{s.county} · {s.st} · {s.players}players</div>
              </div>
              <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                {nE > 0 ? <ElitePip n={nE} /> : null}
                {nT > 0 ? <TrackedPip n={nT} /> : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const search = (
    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / coach / county…" style={{
      fontFamily: MONO, fontSize: 12, color: A.text, background: A.inset, border: `1px solid ${A.border}`,
      borderRadius: 8, padding: "8px 11px", width: 220, outline: "none",
    }} />
  );

  const notable = school ? school.roster.filter((p) => isGoldTier(p) || p.tracked) : [];

  return (
    <WorkspaceShell eyebrow="DMV Schools" subline="Every school in the database · tap one for its roster" topRight={search} rail={rail}>
      {school ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {countElite(school.roster) > 0 ? <Icon name="crown" style={{ fontSize: 20, color: A.goldSolid }} /> : null}
            <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600, color: A.textHi, margin: 0 }}>{school.name}</h2>
            <span style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
              {countElite(school.roster) > 0 ? <ElitePip n={`${countElite(school.roster)} elite`} /> : null}
              {countTracked(school.roster) > 0 ? <TrackedPip n={`${countTracked(school.roster)} tracked`} /> : null}
            </span>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11.5, color: A.textMut, margin: "7px 0 18px", letterSpacing: "0.03em" }}>
            {school.conf} · {school.county}, {school.st} · {school.coach || "—"}
          </div>

          {notable.length > 0 ? (
            <div style={{ marginBottom: 20 }}>
              <ZoneTitle>Notable prospects</ZoneTitle>
              <div style={{ display: "grid", gap: 2 }}>
                {notable.sort((a, b) => (isGoldTier(b) - isGoldTier(a)) || a.name.localeCompare(b.name)).map((p) => (
                  <div key={p.name} className="a1ws-row" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: 8, ...(isGoldTier(p) ? { background: A.goldTint, borderLeft: `2px solid ${A.goldSolid}` } : { borderLeft: "2px solid transparent" }) }}>
                    <PlayerCell p={p} />
                    <RecruitingStatus p={p} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <ZoneTitle right={`${school.roster.length} shown`}>Full roster · {school.players}</ZoneTitle>
          <RosterTable players={school.roster} mode="recruiting" />
        </div>
      ) : <Empty>No schools match these filters.</Empty>}
    </WorkspaceShell>
  );
}
