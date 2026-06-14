import React, { useState, useMemo, useEffect } from "react";
import { isGold as isGoldMarked, useGold } from "../lib/goldTier";

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
 * Typography (A1 type system): Saira Condensed for names/headings (nameplate,
 * uppercase) + Hanken Grotesk for labels/body/numbers. Icons via Tabler webfont.
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
  accent: "#FF6A1A",   // orange — the workhorse
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
// A1 type system: SERIF = display/nameplate (Saira Condensed, used uppercase),
// MONO = body/labels/numbers (Hanken Grotesk). Neither is actually serif/mono —
// names kept to avoid churn.
const SERIF = "'Saira Condensed', system-ui, -apple-system, sans-serif";
const MONO = "'Hanken Grotesk', system-ui, -apple-system, sans-serif";
// Nameplate style mixin for player names & headings.
const NAMEPLATE = { fontFamily: SERIF, textTransform: "uppercase", letterSpacing: "0.01em" };

// --- Gold-tier config — the SINGLE source that drives every gold element ------
// Gold tier = the APEX of the Prospera evaluation: the handful of prospects the
// 9-axis eval engine grades in its top bucket — "blue-chip / elite." It's our
// conviction made visible: gold says "Prospera believes this kid is genuinely
// special." It is set MANUALLY by the user (a stored `goldTier` flag on the
// prospect) — never auto-derived from offers, commits, or a consensus board, so
// it carries our point of view, not someone else's. Keep it to ONE top tier; a
// second gold tier destroys the signal. Change the definition here only.
// Honored from two places: a baked `goldTier` flag in the data OR the user's
// in-app manual mark (localStorage, keyed by prospect id) — see src/lib/goldTier.
const isGoldTier = (p) => !!(p && (p.goldTier || isGoldMarked(p.id)));
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
  if (active && tone === "tracked") style = { border: `1px solid ${A.accent}`, background: "rgba(255, 106, 26,0.14)", color: A.accent };
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
function PlayerCell({ p, onOpen }) {
  const gold = isGoldTier(p);
  const clickable = !!(onOpen && p.id);
  const nameStyle = { ...NAMEPLATE, fontSize: 15.5, fontWeight: 700, color: p.tracked ? A.accent : A.textHi, background: "transparent", border: "none", padding: 0, textAlign: "left", cursor: clickable ? "pointer" : "default", textDecoration: clickable ? "none" : undefined };
  return (
    <div style={{ minWidth: 0 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {clickable
          ? <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(p.id); }} title="Open profile" style={nameStyle}>{p.tracked ? "● " : ""}{p.name}</button>
          : <span style={nameStyle}>{p.tracked ? "● " : ""}{p.name}</span>}
        {gold ? <TierBadge compact /> : null}
      </span>
      <div style={{ fontFamily: MONO, fontSize: 10.5, color: A.textMut, letterSpacing: "0.04em", marginTop: 2 }}>
        {[p.pos, p.class ? `'${String(p.class).replace(/^'/, "")}` : null].filter(Boolean).join(" · ")}
        {p.archetype ? <span style={{ color: A.accent, fontWeight: 600 }}>{(p.pos || p.class) ? " · " : ""}{p.archetype}{p.archetypeEarly ? " ·early" : ""}</span> : null}
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

// Recruiting status cell — a recruiting FACT (commitment), independent of gold
// tier. Gold = our eval apex, not recruiting status, so the two never conflate.
function RecruitingStatus({ p }) {
  if (p.commit) return <span style={{ fontFamily: MONO, fontSize: 11.5, color: A.accent, fontWeight: 600 }}>→ {p.commit}</span>;
  return <span style={{ fontFamily: MONO, fontSize: 12, color: A.textFaint }}>—</span>;
}

export function RosterTable({ players, mode = "stats", onOpen }) {
  useGold(); // re-render when a gold mark toggles
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
            <tr key={`${p.name}-${i}`} className="a1ws-row" style={{ ...rowStyle(p), borderBottom: `1px solid ${A.border}` }}>
              <td style={{ padding: "9px 10px", fontFamily: MONO, fontSize: 12, color: A.textFaint, width: 36 }}>{i + 1}</td>
              <td style={{ padding: "9px 10px" }}><PlayerCell p={p} onOpen={onOpen} /></td>
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
      padding: "9px 10px", textAlign: "right", fontFamily: MONO, fontVariantNumeric: "tabular-nums", fontSize: 15,
      color: isGp ? (low ? A.amber : A.text) : A.text, fontWeight: 600,
    }}>{v == null ? "—" : (isGp ? v : Number(v).toFixed(1))}</td>
  );
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead><tr>
        <TH>Player</TH>
        <TH right active={sortKey === "gp"} dir={dir} onClick={() => onSort("gp")}>GP</TH>
        <TH right active={sortKey === "mpg"} dir={dir} onClick={() => onSort("mpg")}>MPG</TH>
        <TH right active={sortKey === "pts"} dir={dir} onClick={() => onSort("pts")}>PTS</TH>
        <TH right active={sortKey === "reb"} dir={dir} onClick={() => onSort("reb")}>REB</TH>
        <TH right active={sortKey === "ast"} dir={dir} onClick={() => onSort("ast")}>AST</TH>
      </tr></thead>
      <tbody>
        {rows.map((p, i) => {
          const low = (p.gp ?? 0) < 2; // small-sample discipline
          return (
            <tr key={`${p.name}-${i}`} className="a1ws-row" style={{ ...rowStyle(p), borderBottom: `1px solid ${A.border}`, opacity: low ? 0.62 : 1 }}>
              <td style={{ padding: "9px 10px" }}><PlayerCell p={p} onOpen={onOpen} /></td>
              {numCell(p.gp, low, true)}
              {numCell(p.mpg, low)}
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

// Summer League teams + rosters (stats mode). goldTier=true is a MANUAL apex/
// elite mark (set by the user, → gold treatment); commit names the recruiting
// destination when known (a separate recruiting fact, not what drives gold).
const SEED_SUMMER_TEAMS = [
  { name: "DeMatha", conf: "WCAC", region: "MD", gp: 6, coach: "Mike G. Jones III", roster: [
    { name: "A. Whitfield", pos: "SF", class: "27", gp: 6, pts: 18.2, reb: 6.1, ast: 2.4, tracked: true},
    { name: "M. Okafor", pos: "C", class: "28", gp: 6, pts: 11.0, reb: 9.3, ast: 1.1, tracked: true},
    { name: "J. Ellis", pos: "PG", class: "27", gp: 6, pts: 14.5, reb: 3.0, ast: 5.2 },
    { name: "D. Carter", pos: "SG", class: "29", gp: 5, pts: 9.8, reb: 2.1, ast: 1.4 },
    { name: "R. Banks", pos: "PF", class: "28", gp: 6, pts: 7.2, reb: 5.5, ast: 0.8 },
  ] },
  { name: "Hawks (Hayfield)", conf: "Public", region: "VA", gp: 4, coach: "Carlos Poindexter", roster: [
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
    { name: "Drew Hill", pos: "SG", class: "27", gp: 3, pts: 31.5, reb: 4.0, ast: 3.2, goldTier: true, commit: "Kansas", tracked: true },
    { name: "L. Park", pos: "PF", class: "28", gp: 3, pts: 9.0, reb: 6.2, ast: 1.0 },
  ] },
  { name: "Paul VI", conf: "WCAC", region: "VA", gp: 5, coach: "—", roster: [
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
    { name: "J. Marshall", pos: "SF", class: "26", goldTier: true, commit: "Maryland", tracked: true },
    { name: "A. Whitfield", pos: "SF", class: "27", tracked: true},
    { name: "M. Okafor", pos: "C", class: "28", tracked: true},
    { name: "J. Ellis", pos: "PG", class: "27" },
    { name: "D. Carter", pos: "SG", class: "29" },
    { name: "R. Banks", pos: "PF", class: "28" },
  ] },
  { name: "Gonzaga College HS", conf: "WCAC", county: "Washington", st: "DC", players: 20, coach: "Keith Urgo", roster: [
    { name: "T. Bennett", pos: "PG", class: "26", goldTier: true, commit: "Georgetown", tracked: true },
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
function Watchlist({ teams, onOpen }) {
  const tracked = useMemo(() => {
    const out = [];
    for (const t of teams) for (const p of t.roster) if (p.tracked) out.push({ ...p, team: t.name });
    return out.sort((a, b) => (b.pts ?? 0) - (a.pts ?? 0)).slice(0, 3);
  }, [teams]);
  if (!tracked.length) return null; // no watchlist yet — hide the module
  return (
    <div style={{ background: "rgba(255, 106, 26,0.06)", border: `1px solid rgba(255, 106, 26,0.28)`, borderRadius: 10, padding: "14px 16px", marginBottom: 18 }}>
      <ZoneTitle right="across all teams">My guys this summer</ZoneTitle>
      <div style={{ display: "grid", gap: 9 }}>
        {tracked.map((p, i) => {
          const low = (p.gp ?? 0) < 2;
          return (
            <div key={`${p.name}-${i}`} style={{ display: "flex", alignItems: "center", gap: 10, opacity: low ? 0.62 : 1 }}>
              {onOpen && p.id
                ? <button type="button" onClick={() => onOpen(p.id)} style={{ ...NAMEPLATE, fontSize: 15.5, fontWeight: 700, color: A.accent, flex: "0 0 auto", background: "transparent", border: "none", padding: 0, cursor: "pointer" }}>{p.name}</button>
                : <span style={{ ...NAMEPLATE, fontSize: 15.5, fontWeight: 700, color: A.accent, flex: "0 0 auto" }}>{p.name}</span>}
              {isGoldTier(p) ? <TierBadge compact /> : null}
              <span style={{ fontFamily: MONO, fontSize: 11, color: A.textMut, flex: "1 1 auto", minWidth: 0 }}>{p.team}</span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: low ? A.amber : A.textFaint, whiteSpace: "nowrap" }}>
                {p.gp} GP{low ? " · small" : ""}
              </span>
              <span style={{ fontFamily: MONO, fontVariantNumeric: "tabular-nums", fontSize: 18, fontWeight: 700, color: A.textHi, whiteSpace: "nowrap" }}>{Number(p.pts).toFixed(1)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Generic facet toggle-set state helper: a Set of active values per group.
function useFacet() {
  // Empty selection = NO filter (show everything). Clicking a chip adds it to the
  // filter; clicking more is an OR. Nothing is selected by default.
  const [on, setOn] = useState(new Set());
  const toggle = (v) => setOn((prev) => {
    const next = new Set(prev);
    next.has(v) ? next.delete(v) : next.add(v);
    return next;
  });
  const pass = (v) => on.size === 0 || on.has(v);
  return { on, toggle, pass };
}

// =============================================================================
// 2 · SUMMER LEAGUE SECTION
// =============================================================================
const REGIONS = ["DC", "MD", "VA"];   // by state (real data has no NoVA split)
const CLASSES = ["27", "28", "29", "30"];
const LEVELS = ["HS", "Summer", "AAU"]; // competition context

// Copy a shareable deep-link to a team page (the "text a coach their team" unlock).
function TeamShareButton({ slug }) {
  const [copied, setCopied] = useState(false);
  if (!slug) return null;
  const copy = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/team/${slug}`;
    try { await navigator.clipboard.writeText(url); }
    catch { const ta = document.createElement("textarea"); ta.value = url; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch {} ta.remove(); }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button type="button" onClick={copy} title="Copy a shareable link to this team page"
      style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, borderRadius: 6, padding: "6px 11px", cursor: "pointer", color: copied ? "#0B0E13" : A.accent, background: copied ? A.accent : "transparent", border: `1px solid ${A.accent}` }}>
      {copied ? "Link copied ✓" : "↗ Share team"}
    </button>
  );
}

// Team leaders from the roster (top per-game in each category, GP-gated).
function teamLeaders(roster) {
  const best = (k) => roster.filter((p) => p[k] != null && (p.gp || 0) >= 1).sort((a, b) => (b[k] ?? -1) - (a[k] ?? -1))[0];
  return [["PTS", "pts"], ["REB", "reb"], ["AST", "ast"]].map(([lab, k]) => [lab, best(k)]).filter(([, p]) => p);
}

// Per-team games table — results (played) or upcoming (scheduled).
function TeamGames({ games, kind }) {
  const clean = (o) => String(o || "").replace(/\s*\([^)]*\)/g, "").trim();
  if (!games || !games.length) return <Empty>{kind === "results" ? "No games played yet." : "No upcoming games scheduled."}</Empty>;
  const th = { fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: A.textMut, padding: "8px 12px", textAlign: "left", borderBottom: `1px solid ${A.border}` };
  const td = { fontFamily: MONO, fontSize: 12.5, color: A.text, padding: "10px 12px", borderBottom: `1px solid ${A.border}` };
  const rows = kind === "results" ? [...games].sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0)) : games;
  return (
    <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 8, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>
          <th style={th}>Date</th><th style={th}>Opponent</th><th style={{ ...th, textAlign: "right" }}>{kind === "results" ? "Result" : "Tip"}</th>
        </tr></thead>
        <tbody>
          {rows.map((g, i) => (
            <tr key={i}>
              <td style={td}>{g.date}</td>
              <td style={td}>{kind === "upcoming" ? (g.isHome ? "vs " : "@ ") : ""}{clean(g.opp)}</td>
              <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {kind === "results"
                  ? (g.won != null ? <><span style={{ color: g.won ? "#36d399" : "#f06a6a", fontWeight: 800 }}>{g.won ? "W" : "L"}</span> {g.teamScore}-{g.oppScore}</> : "—")
                  : (g.time || "TBD")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SummerLeagueSection({ recaps = [], teams: teamsProp, onOpenProfile, focusTeam }) {
  useGold();
  const TEAM_DATA = teamsProp && teamsProp.length ? teamsProp : SEED_SUMMER_TEAMS;
  const [tab, setTab] = useState("teams");    // DEFAULT = Teams list (scoring leaders live on the Prospects tab)
  const [teamTab, setTeamTab] = useState("roster"); // inner tab on a team page: roster | matchups | schedule

  // Teams-workspace state lives here (above the shell) so filters persist across
  // team selection and tab switches.
  const lvl = useFacet(LEVELS);
  const region = useFacet(REGIONS);
  const klass = useFacet(CLASSES);
  const [trackedOnly, setTrackedOnly] = useState(false);
  const [goldOnly, setGoldOnly] = useState(false);
  const [selected, setSelected] = useState(null);

  // Deep-link / map-pin focus: open the Teams pane on a specific team (by name or slug).
  useEffect(() => {
    if (!focusTeam) return;
    setTab("teams");
    const m = TEAM_DATA.find((t) => t.slug === focusTeam || t.name === focusTeam);
    setSelected(m ? (m.slug || m.name) : focusTeam);
  }, [focusTeam, TEAM_DATA]);
  useEffect(() => { setTeamTab("roster"); }, [selected]); // each team page opens on its roster

  // Fork (a): the Class facet keeps a team if ANY roster player matches a
  // selected class (team-level) — the default. (Alternative: filter roster ROWS.)
  const teams = useMemo(() => TEAM_DATA.filter((t) => {
    if (!lvl.pass(t.level || "Summer")) return false;
    if (!region.pass(t.region)) return false;
    if (!klass.pass("__all__") && !t.roster.some((p) => klass.on.has(String(p.class)))) return false;
    if (trackedOnly && countTracked(t.roster) === 0) return false;
    if (goldOnly && countElite(t.roster) === 0) return false;
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name)), [TEAM_DATA, lvl, region, klass, trackedOnly, goldOnly]);

  // A team is only "open" once clicked (or deep-linked) — otherwise we show the
  // browsable team list full-width.
  const team = selected ? (teams.find((t) => (t.slug || t.name) === selected) || teams.find((t) => t.name === selected) || null) : null;

  // Shared facet controls for the browse view.
  const facets = (
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 16 }}>
      <FacetGroup label="Level">{LEVELS.map((l) => <Chip key={l} active={lvl.on.has(l)} onClick={() => lvl.toggle(l)}>{l}</Chip>)}</FacetGroup>
      <FacetGroup label="Region">{REGIONS.map((r) => <Chip key={r} active={region.on.has(r)} onClick={() => region.toggle(r)}>{r}</Chip>)}</FacetGroup>
      <FacetGroup label="Class">{CLASSES.map((c) => <Chip key={c} active={klass.on.has(c)} onClick={() => klass.toggle(c)}>'{c}</Chip>)}</FacetGroup>
      <FacetGroup label="Watchlist">
        <Chip tone="tracked" icon="star" active={trackedOnly} onClick={() => setTrackedOnly((v) => !v)}>My tracked only</Chip>
        <Chip tone="gold" icon="crown" active={goldOnly} onClick={() => setGoldOnly((v) => !v)}>{GOLD_TIER_LABEL}</Chip>
      </FacetGroup>
    </div>
  );

  // Browse: facets + a full-width team grid. Click a team → its full page.
  const teamBrowse = (
    <div>
      <Watchlist teams={TEAM_DATA} onOpen={onOpenProfile} />
      {facets}
      <Label style={{ color: A.textFaint, marginBottom: 10 }}>{teams.length} teams</Label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 8 }}>
        {teams.map((t) => {
          const nT = countTracked(t.roster), nE = countElite(t.roster);
          return (
            <button key={t.slug || t.name} type="button" className="a1ws-row" onClick={() => setSelected(t.slug || t.name)} style={{
              display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", textAlign: "left",
              padding: "12px 14px", borderRadius: 8, cursor: "pointer", background: A.surface, border: `1px solid ${A.border}`,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ ...NAMEPLATE, fontSize: 14.5, fontWeight: 700, color: A.textHi, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: A.textFaint, letterSpacing: "0.04em", marginTop: 3 }}>{[t.level, t.region, `${t.gp}gp`].filter(Boolean).join(" · ")}</div>
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

  // Full-page team detail — roster (players) FIRST; team leaders / top
  // performances / recaps live below (scoring leaders are the Players tab's job).
  const teamDetailFull = team ? (
    <div>
      <button type="button" onClick={() => setSelected(null)} style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em", color: A.accent, background: "transparent", border: "none", textTransform: "uppercase", padding: 0, cursor: "pointer", marginBottom: 14 }}>← All teams</button>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ ...NAMEPLATE, fontSize: 28, fontWeight: 700, color: A.textHi, margin: 0 }}>{team.name}</h2>
        {countElite(team.roster) > 0 ? <ElitePip n={`${countElite(team.roster)} elite`} /> : null}
        {countTracked(team.roster) > 0 ? <TrackedPip n={`${countTracked(team.roster)} tracked`} /> : null}
        <span style={{ marginLeft: "auto" }}><TeamShareButton slug={team.slug} /></span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "8px 0 4px" }}>
        {team.level && <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, color: A.accent, border: `1px solid ${A.accent}`, borderRadius: 4, padding: "2px 7px" }}>{team.level}</span>}
        <span style={{ fontFamily: MONO, fontSize: 11.5, color: A.textMut, letterSpacing: "0.03em" }}>
          {[team.circuit, team.season, team.region, `${team.gp} games`, team.coach || "—"].filter(Boolean).join(" · ")}
        </span>
      </div>

      {/* inner tabs: roster first, then matchups (results) + schedule (upcoming) */}
      <div style={{ display: "flex", gap: 2, borderBottom: `1px solid ${A.border}`, margin: "12px 0 16px" }}>
        {["Roster", "Matchups", "Schedule"].map((lbl) => {
          const key = lbl.toLowerCase(), active = teamTab === key;
          return (
            <button key={key} type="button" onClick={() => setTeamTab(key)} style={{
              fontFamily: MONO, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase",
              color: active ? A.accent : A.textMut, background: "transparent", border: "none",
              padding: "10px 16px", borderBottom: `2px solid ${active ? A.accent : "transparent"}`,
              cursor: "pointer", fontWeight: active ? 700 : 600,
            }}>{lbl}</button>
          );
        })}
      </div>

      {teamTab === "roster" && (
        <div>
          <RosterTable players={team.roster} mode="stats" onOpen={onOpenProfile} />
          {teamLeaders(team.roster).length > 0 && (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "baseline", margin: "20px 0 0" }}>
              <Label style={{ color: A.textMut }}>Leaders</Label>
              {teamLeaders(team.roster).map(([lab, p]) => (
                <span key={lab} style={{ fontFamily: MONO, fontSize: 11, color: A.textMut, letterSpacing: "0.04em" }}>
                  {lab} <span style={{ color: A.textHi }}>{p.name}</span> <span style={{ color: A.accent, fontWeight: 700 }}>{Number(p[lab.toLowerCase()]).toFixed(1)}</span>
                </span>
              ))}
            </div>
          )}
          {team.topGames && team.topGames.length > 0 && (
            <div style={{ margin: "16px 0 0" }}>
              <Label style={{ color: A.textMut, marginBottom: 7 }}>Top performances</Label>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {team.topGames.map((g, i) => (
                  <span key={i} style={{ fontFamily: MONO, fontSize: 11, color: A.textMut, letterSpacing: "0.03em" }}>
                    <span style={{ color: A.textHi }}>{g.player}</span> <span style={{ color: A.accent, fontWeight: 700 }}>{g.pts}</span> <span style={{ color: A.textFaint }}>vs {String(g.opp || "").replace(/\s*\([^)]*\)/g, "").slice(0, 16)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {teamTab === "matchups" && <TeamGames games={team.matchups} kind="results" />}
      {teamTab === "matchups" && <div style={{ marginTop: 16 }}><CoverageList recaps={recaps} teamName={team.name} /></div>}
      {teamTab === "schedule" && <TeamGames games={team.upcoming} kind="upcoming" />}
    </div>
  ) : null;

  return (
    <WorkspaceShell
      eyebrow="DMV Teams · HS · Summer · AAU"
      subline={tab === "teams" ? (team ? "Full team page · tap a player to open their profile" : "Tap a team for its full page · filters persist")
        : "Full league slate · results and upcoming"}
      topRight={<Segmented value={tab} onChange={setTab} options={[["teams", "Teams"], ["schedule", "Schedule"]]} />}
      rail={null}
    >
      {tab === "teams" ? (team ? teamDetailFull : teamBrowse) : <SummerSchedule recaps={recaps} />}
    </WorkspaceShell>
  );
}

function SummerPlayers({ teams = SEED_SUMMER_TEAMS, onOpen }) {
  useGold();
  // Leaderboard across all teams, GP-gated (GP<2 dimmed). Top 50 by PPG.
  const all = useMemo(() => {
    const out = [];
    for (const t of teams) for (const p of t.roster) if ((p.gp ?? 0) > 0 && p.pts != null) out.push({ ...p, team: t.name });
    return out.sort((a, b) => (b.pts ?? 0) - (a.pts ?? 0));
  }, [teams]);
  const top = all.slice(0, 50);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 20 }} className="a1ws-players">
      <style>{`@media (max-width:560px){.a1ws-players{grid-template-columns:1fr !important;}}`}</style>
      <div>
        <ZoneTitle right={`top ${top.length} of ${all.length}`}>Scoring leaders</ZoneTitle>
        <div style={{ display: "grid", gap: 2 }}>
          {top.map((p, i) => {
            const low = (p.gp ?? 0) < 2;
            const clickable = onOpen && p.id;
            return (
              <div key={p.name + p.team} className="a1ws-row" style={{ display: "grid", gridTemplateColumns: "26px 1fr auto auto", gap: 12, alignItems: "center", padding: "8px 10px", borderRadius: 8, ...(isGoldTier(p) ? { background: A.goldTint, borderLeft: `2px solid ${A.goldSolid}` } : { borderLeft: "2px solid transparent" }), opacity: low ? 0.62 : 1 }}>
                <span style={{ fontFamily: MONO, fontSize: 12, color: i === 0 ? A.accent : A.textFaint, fontWeight: i === 0 ? 700 : 400 }}>{i + 1}</span>
                <div style={{ minWidth: 0 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {clickable
                      ? <button type="button" onClick={() => onOpen(p.id)} style={{ ...NAMEPLATE, fontSize: 15.5, fontWeight: 700, color: p.tracked ? A.accent : A.textHi, background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>{p.tracked ? "● " : ""}{p.name}</button>
                      : <span style={{ ...NAMEPLATE, fontSize: 15.5, fontWeight: 700, color: p.tracked ? A.accent : A.textHi }}>{p.tracked ? "● " : ""}{p.name}</span>}
                    {isGoldTier(p) ? <TierBadge compact /> : null}
                  </span>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: A.textMut, marginTop: 2 }}>{[p.team, p.pos, p.class ? `'${p.class}` : null].filter(Boolean).join(" · ")}</div>
                </div>
                <span style={{ fontFamily: MONO, fontSize: 10, color: low ? A.amber : A.textFaint, whiteSpace: "nowrap" }}>{p.gp} GP{low ? " · small" : ""}</span>
                <span style={{ fontFamily: MONO, fontVariantNumeric: "tabular-nums", fontSize: 18, fontWeight: 700, color: A.textHi, whiteSpace: "nowrap" }}>{Number(p.pts).toFixed(1)}</span>
              </div>
            );
          })}
        </div>
      </div>
      <Watchlist teams={teams} onOpen={onOpen} />
    </div>
  );
}

// Tiny seed schedule so the feed renders; wire to schedule.json later. Matchups
// chosen to line up with scraped recaps/previews so the attachment is visible.
const SEED_GAMES = [
  { date: "Jun 1", home: "Good Counsel", away: "Coolidge", status: "final" },     // Day 10 recap
  { date: "Jun 1", home: "DeMatha", away: "Bullis", status: "final" },            // Day 10 recap (Ledo's GotW)
  { date: "Jun 1", home: "Wootton", away: "Broadneck", status: "final" },         // Day 10 recap
  { date: "Jun 6", home: "Jackson-Reed", away: "Gonzaga", time: "6:15 pm", status: "scheduled" }, // preview
  { date: "May 31", home: "Blake", away: "South River", time: "1:00 pm", status: "scheduled" },   // preview
];
function SummerSchedule({ recaps = [] }) {
  return (
    <div>
      <ZoneTitle right={`${SEED_GAMES.length} games`}>Games feed</ZoneTitle>
      <div style={{ display: "grid", gap: 8 }}>
        {SEED_GAMES.map((g, i) => <ScheduleRow key={i} g={g} recaps={recaps} />)}
      </div>
    </div>
  );
}

// One schedule game + an inline expander for the matched recap (final) or
// preview (upcoming), pulled from the scraped coverage by matchup.
function ScheduleRow({ g, recaps }) {
  const [open, setOpen] = useState(false);
  const final = g.status === "final";
  const match = useMemo(() => gameForMatchup(recaps, g.home, g.away, final ? "recap" : "preview"), [recaps, g, final]);
  return (
    <div style={{ background: A.surface, border: `1px solid ${A.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "64px 1fr auto auto", gap: 12, alignItems: "center", padding: "10px 12px" }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: A.textMut, letterSpacing: "0.06em" }}>{g.date}</span>
        <span style={{ fontFamily: SERIF, fontSize: 14, color: A.textHi }}>{g.home} <span style={{ color: A.textFaint, fontFamily: MONO, fontSize: 11 }}>vs</span> {g.away}</span>
        {match
          ? <button type="button" onClick={() => setOpen((v) => !v)} style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: final ? A.accent : A.info, background: "transparent", border: `1px solid ${final ? A.accent : A.info}`, borderRadius: 5, padding: "3px 8px", cursor: "pointer", whiteSpace: "nowrap" }}>{final ? "Recap" : "Preview"} {open ? "▾" : "▸"}</button>
          : <span />}
        {final
          ? <span style={{ fontFamily: MONO, fontSize: 12, color: A.textMut, whiteSpace: "nowrap" }}>{g.hs != null ? `${g.hs}–${g.as}` : "Final"}</span>
          : <span style={{ fontFamily: MONO, fontSize: 12, color: A.accent, fontWeight: 600, whiteSpace: "nowrap" }}>{g.time}</span>}
      </div>
      {open && match ? (
        <div style={{ padding: "0 12px 12px", fontFamily: MONO, fontSize: 12.5, lineHeight: 1.6, color: A.textMut, whiteSpace: "pre-wrap" }}>
          {match.text}
          <a href={match.recap.url} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 8, color: A.info, fontSize: 11, textDecoration: "none" }}>{match.recap.title} ↗</a>
        </div>
      ) : null}
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

export function SchoolsSection({ schools: schoolsData, onOpenProfile, focusSchool }) {
  useGold();
  const SCHOOL_DATA = schoolsData && schoolsData.length ? schoolsData : SEED_SCHOOLS;
  const state = useFacet(STATES);
  const [hasTracked, setHasTracked] = useState(false);
  const [goldOnly, setGoldOnly] = useState(false);
  const [sort, setSort] = useState("az");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState("DeMatha Catholic");
  // Deep-link: when a map pin (or other surface) requests a school, select it.
  useEffect(() => { if (focusSchool) setSelected(focusSchool); }, [focusSchool]);

  const schools = useMemo(() => {
    const k = q.trim().toLowerCase();
    let list = SCHOOL_DATA.filter((s) => {
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
  }, [SCHOOL_DATA, state, hasTracked, goldOnly, sort, q]);

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
              background: on ? "rgba(255, 106, 26,0.12)" : "transparent",
              border: `1px solid ${on ? A.accent : "transparent"}`,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ ...NAMEPLATE, fontSize: 13.5, fontWeight: 700, color: A.textHi, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
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
            <h2 style={{ ...NAMEPLATE, fontSize: 25, fontWeight: 700, color: A.textHi, margin: 0 }}>{school.name}</h2>
            <span style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
              {countElite(school.roster) > 0 ? <ElitePip n={`${countElite(school.roster)} elite`} /> : null}
              {countTracked(school.roster) > 0 ? <TrackedPip n={`${countTracked(school.roster)} tracked`} /> : null}
            </span>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11.5, color: A.textMut, margin: "7px 0 18px", letterSpacing: "0.03em" }}>
            {[school.conf, [school.county, school.st].filter(Boolean).join(", "), school.coach || "—"].filter(Boolean).join(" · ")}
          </div>

          {school.roster.length === 0 ? (
            <div style={{ border: `1px dashed ${A.border}`, borderRadius: 10, padding: "18px 16px", textAlign: "center" }}>
              <div style={{ fontFamily: MONO, fontSize: 12, color: A.textMut, lineHeight: 1.6 }}>
                In the DMV directory — <span style={{ color: A.text }}>no players tracked yet</span>.<br />
                Players attach automatically as they're scouted or appear in summer-league rosters.
              </div>
            </div>
          ) : null}

          {notable.length > 0 ? (
            <div style={{ marginBottom: 20 }}>
              <ZoneTitle>Notable prospects</ZoneTitle>
              <div style={{ display: "grid", gap: 2 }}>
                {notable.sort((a, b) => (isGoldTier(b) - isGoldTier(a)) || a.name.localeCompare(b.name)).map((p, i) => (
                  <div key={`${p.name}-${i}`} className="a1ws-row" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: 8, ...(isGoldTier(p) ? { background: A.goldTint, borderLeft: `2px solid ${A.goldSolid}` } : { borderLeft: "2px solid transparent" }) }}>
                    <PlayerCell p={p} onOpen={onOpenProfile} />
                    <RecruitingStatus p={p} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {school.roster.length > 0 ? (
            <>
              <ZoneTitle right={`${school.roster.length} shown`}>Full roster · {school.players}</ZoneTitle>
              <RosterTable players={school.roster} mode="recruiting" onOpen={onOpenProfile} />
            </>
          ) : null}
        </div>
      ) : <Empty>No schools match these filters.</Empty>}
    </WorkspaceShell>
  );
}

// =============================================================================
// RECAP MATCHING — link scraped recaps/previews/features to teams & games.
// =============================================================================
const slugify = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
// A team's identity key: the parenthetical alias if present ("Hawks (Hayfield)"
// → "hayfield"), else the whole name.
const teamKey = (n) => { const m = String(n || "").match(/\(([^)]+)\)/); return slugify(m ? m[1] : n); };
const mentions = (text, name) => { const k = teamKey(name); return k.length > 2 && slugify(text).includes(k); };

const TYPE_LABEL = { recap: "Recap", "notable-games": "Notable", takeaways: "Takeaways", preview: "Preview", feature: "Feature" };
const TYPE_COLOR = { recap: A.accent, "notable-games": A.accent, takeaways: A.accent, preview: A.info, feature: A.accent2 };

// Recaps/coverage that name a given team (in title, a game matchup, or body).
function coverageForTeam(recaps, teamName) {
  if (!Array.isArray(recaps)) return [];
  return recaps.filter((r) =>
    mentions(r.title, teamName) ||
    mentions(r.bodyText, teamName) ||
    (r.games || []).some((g) => g.matchup && mentions(g.matchup, teamName))
  );
}
// The recap (and specific game text) covering a home/away matchup.
function gameForMatchup(recaps, home, away, kind) {
  if (!Array.isArray(recaps)) return null;
  const types = kind === "preview" ? ["preview"] : ["recap", "notable-games", "takeaways"];
  for (const r of recaps.filter((x) => types.includes(x.type))) {
    if (kind === "preview") {
      if (mentions(r.title, home) && mentions(r.title, away)) return { recap: r, text: r.excerpt };
      continue;
    }
    for (const g of r.games || []) {
      if (g.matchup && mentions(g.matchup, home) && mentions(g.matchup, away)) return { recap: r, text: g.text, game: g };
    }
    // single-game recap titled with the matchup
    if (mentions(r.title, home) && mentions(r.title, away)) return { recap: r, text: r.bodyText };
  }
  return null;
}

const TypeChip = ({ type }) => (
  <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: TYPE_COLOR[type] || A.textMut, border: `1px solid ${TYPE_COLOR[type] || A.border}`, borderRadius: 5, padding: "2px 6px", whiteSpace: "nowrap" }}>
    {TYPE_LABEL[type] || type}
  </span>
);

// --- Coverage list (team detail) ---------------------------------------------
function CoverageList({ recaps, teamName }) {
  const [openId, setOpenId] = useState(null);
  const items = useMemo(() => coverageForTeam(recaps, teamName).slice(0, 6), [recaps, teamName]);
  if (!items.length) return null;
  return (
    <div style={{ marginTop: 22 }}>
      <ZoneTitle right={`${items.length}`}>Coverage</ZoneTitle>
      <div style={{ display: "grid", gap: 6 }}>
        {items.map((r) => {
          const open = openId === r.id;
          // prefer the game text that names this team, else the excerpt
          const g = (r.games || []).find((x) => x.matchup && mentions(x.matchup, teamName));
          const snippet = open ? (g?.text || r.bodyText) : r.excerpt;
          return (
            <div key={r.id} style={{ border: `1px solid ${A.border}`, borderRadius: 8, background: A.surface, overflow: "hidden" }}>
              <button type="button" onClick={() => setOpenId(open ? null : r.id)} className="a1ws-row" style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: "9px 11px", display: "flex", alignItems: "center", gap: 9 }}>
                <TypeChip type={r.type} />
                <span style={{ fontFamily: SERIF, fontSize: 14, color: A.textHi, flex: "1 1 auto", minWidth: 0 }}>{r.title}</span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: A.textFaint, whiteSpace: "nowrap" }}>{r.date}</span>
              </button>
              <div style={{ padding: "0 11px 11px", fontFamily: MONO, fontSize: 12.5, lineHeight: 1.6, color: A.textMut, whiteSpace: "pre-wrap" }}>
                {snippet}
                {open ? <a href={r.url} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 8, color: A.info, fontSize: 11, textDecoration: "none" }}>Read full at Capitol Hoops ↗</a> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Recaps feed (its own nav section) ---------------------------------------
const FEED_FILTERS = [["all", "All"], ["recap", "Recaps"], ["preview", "Previews"], ["feature", "Features"]];
const inFilter = (r, f) => f === "all" || (f === "recap" ? ["recap", "notable-games", "takeaways"].includes(r.type) : r.type === f);

export function RecapsFeed({ recaps = [] }) {
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(null);
  const items = useMemo(() => recaps.filter((r) => inFilter(r, filter)), [recaps, filter]);
  const open = openId ? recaps.find((r) => r.id === openId) : null;

  return (
    <WorkspaceShell
      eyebrow="Capitol Hoops Coverage"
      subline={open ? "Full story" : "Game recaps, matchup previews & team features"}
      topRight={open
        ? <button type="button" onClick={() => setOpenId(null)} style={{ fontFamily: MONO, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: A.info, background: "transparent", border: `1px solid ${A.border}`, borderRadius: 6, padding: "6px 11px", cursor: "pointer" }}>← All coverage</button>
        : <div style={{ display: "flex", gap: 6 }}>{FEED_FILTERS.map(([v, l]) => <Chip key={v} active={filter === v} onClick={() => setFilter(v)}>{l}</Chip>)}</div>}
    >
      {open ? <RecapReader recap={open} /> : (
        <div className="a1ws-feed" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          <style>{`@media (max-width:560px){.a1ws-feed{grid-template-columns:1fr !important;}}`}</style>
          {items.map((r) => (
            <button key={r.id} type="button" onClick={() => setOpenId(r.id)} style={{ textAlign: "left", background: A.surface, border: `1px solid ${A.border}`, borderRadius: 12, overflow: "hidden", cursor: "pointer", padding: 0, display: "flex", flexDirection: "column" }}>
              <div style={{ height: 140, background: A.inset, position: "relative", overflow: "hidden" }}>
                {r.image
                  ? <img src={r.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="ballpark" style={{ fontSize: 30, color: A.textFaint }} /></div>}
                <span style={{ position: "absolute", top: 8, left: 8 }}><TypeChip type={r.type} /></span>
              </div>
              <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: A.textFaint, letterSpacing: "0.06em" }}>{r.date}{r.gameCount ? ` · ${r.gameCount} games` : ""}</div>
                <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 600, color: A.textHi, lineHeight: 1.2 }}>{r.title}</div>
                <div style={{ fontFamily: MONO, fontSize: 12, color: A.textMut, lineHeight: 1.5, flex: 1 }}>{r.excerpt}</div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: A.accent, textTransform: "uppercase", letterSpacing: "0.08em" }}>Read →</div>
              </div>
            </button>
          ))}
          {items.length === 0 ? <Empty>No coverage in this filter.</Empty> : null}
        </div>
      )}
    </WorkspaceShell>
  );
}

function RecapReader({ recap }) {
  const r = recap;
  const games = (r.games || []).filter((g) => g.matchup);
  return (
    <article style={{ maxWidth: 760 }}>
      {r.image ? <img src={r.image} alt="" style={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 12, marginBottom: 16 }} /> : null}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <TypeChip type={r.type} />
        <span style={{ fontFamily: MONO, fontSize: 11, color: A.textFaint }}>{r.date}</span>
      </div>
      <h2 style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 600, color: A.textHi, margin: "0 0 16px", lineHeight: 1.1 }}>{r.title}</h2>
      {games.length ? (
        <div style={{ display: "grid", gap: 18 }}>
          {r.games.map((g, i) => (
            <div key={i}>
              {g.matchup ? <Label style={{ color: A.accent, marginBottom: 8 }}>{g.label || g.matchup}</Label> : null}
              <div style={{ fontFamily: MONO, fontSize: 14, lineHeight: 1.7, color: A.text, whiteSpace: "pre-wrap" }}>{g.text}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontFamily: MONO, fontSize: 14, lineHeight: 1.7, color: A.text, whiteSpace: "pre-wrap" }}>{r.bodyText}</div>
      )}
      <a href={r.url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 18, color: A.info, fontFamily: MONO, fontSize: 12, textDecoration: "none" }}>Read on Capitol Hoops ↗</a>
    </article>
  );
}

// =============================================================================
// 1 · PROSPECTS — single-column ranked board + the unranked tail.
// Lead with judgment (eval), then the rest by summer stat. Honest framing:
// almost everyone sits in Band B until the eval engine grades them.
// =============================================================================
const PROS_STATES = ["DC", "MD", "VA"];
const PROS_POS = ["G", "W", "F"];
const PROS_CLASSES = ["27", "28", "29", "30"];
const PROS_SORTS = [["ranked", "Ranked"], ["ppg", "PPG"], ["az", "A–Z"]];

const posGroup = (pos) => {
  const x = String(pos || "").toUpperCase();
  if (x.includes("SF") || x === "W") return "W";
  if (x.includes("PF") || x.includes("C") || x === "F") return "F";
  if (x.includes("G")) return "G";
  return null;
};
const monogram = (n) => String(n || "").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

function Monogram({ name, gold }) {
  return (
    <div style={{
      width: 34, height: 34, flex: "0 0 auto", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
      background: A.inset, border: `1px solid ${gold ? A.goldSolid : A.border}`,
      fontFamily: SERIF, fontWeight: 700, fontSize: 13, letterSpacing: "0.02em",
      color: gold ? A.goldSolid : A.textMut,
    }}>{monogram(name)}</div>
  );
}

// Neutral recruiting marker (stars / #N Natl) — NOT gold, NOT orange (rule).
function RecruitMarker({ p }) {
  if (!p.stars && !p.natl) return null;
  const txt = [p.stars ? `${p.stars}★` : null, p.natl ? `#${p.natl} Natl` : null].filter(Boolean).join(" · ");
  return (
    <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: A.textMut, border: `1px solid ${A.border}`, borderRadius: 5, padding: "1px 6px", whiteSpace: "nowrap" }}>{txt}</span>
  );
}

function NameMeta({ p, onOpen, pending }) {
  const clickable = !!(onOpen && p.id);
  return (
    <div style={{ minWidth: 0, flex: "1 1 auto" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
        {clickable
          ? <button type="button" onClick={() => onOpen(p.id)} style={{ ...NAMEPLATE, fontSize: 16, fontWeight: 700, color: A.textHi, background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>{p.name}</button>
          : <span style={{ ...NAMEPLATE, fontSize: 16, fontWeight: 700, color: A.textHi }}>{p.name}</span>}
        {isGoldTier(p) ? <TierBadge compact /> : null}
        <RecruitMarker p={p} />
      </span>
      <div style={{ fontFamily: MONO, fontSize: 11, color: A.textMut, marginTop: 1 }}>
        {[p.pos, p.class ? `'${p.class}` : null, p.school].filter(Boolean).join(" · ")}{pending ? " · eval pending" : ""}
      </div>
    </div>
  );
}

export function ProspectsBoard({ prospects = [], onOpen }) {
  useGold();
  const st = useFacet(PROS_STATES);
  const pos = useFacet(PROS_POS);
  const klass = useFacet(PROS_CLASSES);
  const [trackedOnly, setTrackedOnly] = useState(false);
  const [goldOnly, setGoldOnly] = useState(false);
  const [sort, setSort] = useState("ranked");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return prospects.filter((p) => {
      if (!st.pass(p.state)) return false;
      if (!pos.pass(posGroup(p.pos))) return false;
      if (!klass.pass(String(p.class))) return false;
      if (trackedOnly && !p.tracked) return false;
      if (goldOnly && !isGoldTier(p)) return false;
      if (k && !`${p.name} ${p.school || ""}`.toLowerCase().includes(k)) return false;
      return true;
    });
  }, [prospects, st, pos, klass, trackedOnly, goldOnly, q]);

  const rankedAll = filtered.filter((p) => p.boardRank != null || p.evalGrade != null);
  const notable = filtered.filter((p) => p.boardRank == null && p.evalGrade == null && p.ppg != null);

  let banded = true, single = [];
  if (sort === "ppg") { banded = false; single = [...filtered].filter((p) => p.ppg != null).sort((a, b) => (b.ppg ?? 0) - (a.ppg ?? 0)); }
  else if (sort === "az") { banded = false; single = [...filtered].sort((a, b) => a.name.localeCompare(b.name)); }

  const ranked = [...rankedAll].sort((a, b) => (a.boardRank ?? Infinity) - (b.boardRank ?? Infinity) || (b.evalGrade ?? 0) - (a.evalGrade ?? 0));
  const notableSorted = [...notable].sort((a, b) => (b.ppg ?? 0) - (a.ppg ?? 0));
  const NOTABLE_CAP = 80;

  const rankedRow = (p, i) => {
    const gold = isGoldTier(p);
    return (
      <div key={p.id} className="a1ws-row" style={{ display: "grid", gridTemplateColumns: "34px 34px 1fr auto", gap: 12, alignItems: "center", padding: "9px 10px", borderRadius: 8, ...(gold ? { background: A.goldTint, borderLeft: `2px solid ${A.goldSolid}` } : { borderLeft: "2px solid transparent" }) }}>
        <span style={gold ? { fontFamily: SERIF, fontWeight: 700, fontSize: 19, background: A.goldGradient, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } : { fontFamily: MONO, fontSize: 13, color: A.textFaint, fontWeight: 700 }}>{p.boardRank != null ? p.boardRank : i + 1}</span>
        <Monogram name={p.name} gold={gold} />
        <NameMeta p={p} onOpen={onOpen} />
        <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          <div style={{ fontFamily: MONO, fontVariantNumeric: "tabular-nums", fontSize: 18, fontWeight: 700, color: A.accent }}>{p.evalGrade != null ? Number(p.evalGrade).toFixed(1) : "—"}</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: A.textFaint }}>{p.ppg != null ? `${p.ppg.toFixed(1)} ppg · ${p.gp}gp` : "eval"}</div>
        </div>
      </div>
    );
  };
  const notableRow = (p) => {
    const low = (p.gp ?? 0) < 2;
    return (
      <div key={p.id} className="a1ws-row" style={{ display: "grid", gridTemplateColumns: "34px 1fr auto", gap: 12, alignItems: "center", padding: "9px 10px", borderRadius: 8, borderLeft: "2px solid transparent", opacity: low ? 0.62 : 1 }}>
        <Monogram name={p.name} gold={isGoldTier(p)} />
        <NameMeta p={p} onOpen={onOpen} pending />
        <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          <div style={{ fontFamily: MONO, fontVariantNumeric: "tabular-nums", fontSize: 18, fontWeight: 700, color: A.accent }}>{p.ppg != null ? p.ppg.toFixed(1) : "—"}</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: low ? A.amber : A.textFaint }}>ppg · {p.gp}gp{low ? " · small" : ""}</div>
        </div>
      </div>
    );
  };
  const BandHead = ({ children, color }) => (
    <div style={{ ...NAMEPLATE, fontSize: 15, fontWeight: 800, color, margin: "18px 0 8px" }}>{children}</div>
  );

  return (
    <div style={{ background: A.bg, color: A.text, border: `1px solid ${A.border}`, borderRadius: 12, overflow: "hidden" }}>
      <style>{SHELL_CSS}</style>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${A.border}`, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 auto", minWidth: 0 }}>
          <Eyebrow>Prospects</Eyebrow>
          <div style={{ fontFamily: MONO, fontSize: 12, color: A.textMut, marginTop: 5 }}>The full DMV database · {prospects.length} profiles · ranked board first, the rest by summer stat</div>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search player or school…" style={{ fontFamily: MONO, fontSize: 13, color: A.text, background: A.inset, border: `1px solid ${A.border}`, borderRadius: 8, padding: "8px 12px", width: 240, outline: "none" }} />
      </div>

      <div style={{ padding: "14px 20px", maxWidth: 880, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
          {PROS_STATES.map((s) => <Chip key={s} active={st.on.has(s)} onClick={() => st.toggle(s)}>{s}</Chip>)}
          <span style={{ width: 1, height: 18, background: A.border }} />
          {PROS_POS.map((s) => <Chip key={s} active={pos.on.has(s)} onClick={() => pos.toggle(s)}>{s}</Chip>)}
          <span style={{ width: 1, height: 18, background: A.border }} />
          {PROS_CLASSES.map((c) => <Chip key={c} active={klass.on.has(c)} onClick={() => klass.toggle(c)}>'{c}</Chip>)}
          <span style={{ width: 1, height: 18, background: A.border }} />
          <Chip tone="tracked" icon="star" active={trackedOnly} onClick={() => setTrackedOnly((v) => !v)}>Tracked</Chip>
          <Chip tone="gold" icon="crown" active={goldOnly} onClick={() => setGoldOnly((v) => !v)}>{GOLD_TIER_LABEL}</Chip>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", margin: "10px 0" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {PROS_SORTS.map(([v, l]) => (
              <button key={v} type="button" onClick={() => setSort(v)} style={{ fontFamily: MONO, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, padding: "6px 11px", borderRadius: 6, cursor: "pointer", border: `1px solid ${sort === v ? A.accent : A.border}`, background: sort === v ? "rgba(255, 106, 26,0.14)" : "transparent", color: sort === v ? A.accent : A.textMut }}>{l}</button>
            ))}
          </div>
          <Label style={{ color: A.textFaint }}>{filtered.length} prospects · {rankedAll.length} ranked</Label>
        </div>

        {banded ? (
          <>
            <BandHead color={A.goldSolid}>Ranked board</BandHead>
            {ranked.length
              ? <div style={{ display: "grid", gap: 2 }}>{ranked.map(rankedRow)}</div>
              : <div style={{ fontFamily: MONO, fontSize: 12.5, color: A.textFaint, padding: "10px 0", lineHeight: 1.6 }}>No prospects evaluated yet — the ranked board fills as the eval engine grades players. Until then, the full DMV is below by summer production.</div>}
            <BandHead color={A.textMut}>Notable · not yet evaluated</BandHead>
            <div style={{ display: "grid", gap: 2 }}>{notableSorted.slice(0, NOTABLE_CAP).map((p) => notableRow(p))}</div>
            {notableSorted.length > NOTABLE_CAP ? <Label style={{ color: A.textFaint, marginTop: 10 }}>showing top {NOTABLE_CAP} of {notableSorted.length} by summer PPG</Label> : null}
          </>
        ) : (
          <div style={{ display: "grid", gap: 2 }}>{single.slice(0, 120).map((p) => (p.boardRank != null || p.evalGrade != null) ? rankedRow(p) : notableRow(p))}</div>
        )}
      </div>
    </div>
  );
}
