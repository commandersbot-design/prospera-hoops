import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import NEWS_DATA from "./data/news.json";
import TEAM_STATS from "./data/teamStats.json";
import SCHEDULE_DATA from "./data/schedule.json";
import OFFICIAL_SCHOOL_NAMES from "./data/officialSchoolNames.json";
import ProspectFilm from "./components/ProspectFilm";
import PlayerProfileCard from "./components/PlayerProfileCard";
import { SummerLeagueSection, RecapsFeed, ProspectsBoard } from "./components/ScoutingWorkspace";
import { useGold, useVerified } from "./lib/goldTier";
import { buildArc } from "./lib/developmentArc";
import { DevelopmentSection } from "./components/DevelopmentArc";
import { useAuth } from "./lib/auth.jsx";
import { isConfigured as supabaseConfigured } from "./lib/supabaseClient.js";
import { getOverride, myClaimForPlayer } from "./lib/profiles.js";
import AccountButton from "./components/AccountButton";
import ClaimPanel from "./components/ClaimPanel";
import ProfileEditor from "./components/ProfileEditor";
import ClaimedOverlay from "./components/ClaimedOverlay";
import AdminClaims from "./components/AdminClaims";
import { buildArchetypeCohort, archetypeForPlayer, LEVEL_WEIGHT, LEVEL_LABEL, LEVEL_NOTE } from "./lib/archetype";
import StatLine, { seasonStatLine } from "./components/StatLine";
import ScoutHQ from "./components/ScoutHQ";
import { topPerformances } from "./lib/highlights";

// The map module pulls in Leaflet + markercluster + their CSS. Lazy-load it so
// all of that rides in a separate chunk that only downloads when the Map tab is
// opened, keeping the main bundle small.
const ProspectMap = lazy(() => import("./components/ProspectMap"));

// Big datasets (prospects + Capitol Hoops) are fetched at runtime from
// /data/*.json (served out of public/) instead of bundled into the JS, to
// keep the app bundle small as the database grows. initData() populates the
// module-level stores below before the app renders (the App component gates
// render on a successful load), so every component can keep reading PROSPECTS
// / CH_TEAMS / SCHOOLS synchronously without prop-drilling or context.

// ---------------------------------------------------------------------------
// Design tokens — read the CSS custom properties so the whole app stays in
// sync with src/styles/tokens.css (carried from the Prospera framework).
// ---------------------------------------------------------------------------
const T = {
  bg:         "var(--prospera-bg)",
  surface:    "var(--prospera-surface)",
  surface2:   "var(--prospera-surface-2)",
  border:     "var(--prospera-border)",
  borderSoft: "var(--prospera-border-soft)",
  text:       "var(--prospera-text)",
  textDim:    "var(--prospera-text-dim)",
  textMute:   "var(--prospera-text-mute)",
  accent:     "var(--prospera-cyan)",      // brand orange
  signal:     "var(--prospera-signal)",    // cyan click-hint
  positive:   "var(--prospera-positive)",
  warn:       "var(--prospera-warn)",
  danger:     "var(--prospera-danger)",
  track:      "var(--prospera-pct-track)",
};

// Body / UI face — Hanken Grotesk. Used for all labels, nav, captions, body,
// and stat lines. (Name kept `mono` to avoid churn; it is NOT monospace.)
// Numeric columns align via fontVariantNumeric: "tabular-nums" at call sites.
const mono = {
  fontFamily: "'Hanken Grotesk', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};

// Display / nameplate face — Saira Condensed. Used for the brand wordmark,
// large detail-page names, and big display numbers. The "nameplate" look pairs
// it with uppercase + weight 700 at the call sites.
const serif = {
  fontFamily: "'Saira Condensed', system-ui, -apple-system, sans-serif",
};

// Module-level data stores — populated by initData() after the runtime fetch,
// before any component renders. Declared with `let` so they can be replaced.
let PROSPECTS = [];

const STATE_LABELS = { DC: "D.C.", MD: "Maryland", VA: "Virginia" };

// ---------------------------------------------------------------------------
// Capitol Hoops Summer League join. Players are matched to tracked prospects
// by name-slug (same bridge pattern used across the framework). Two directions:
//   - capitolHoopsLinesFor(name) → summer stat lines to merge into a profile
//   - PROSPECT_BY_NAMEKEY        → does a summer player have a tracked profile?
// ---------------------------------------------------------------------------
let CH_TEAMS = {};

function nameKey(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// ---------------------------------------------------------------------------
// Summer-league schedule (Capitol Hoops 2026). Built from src/data/schedule.json
// by scripts/build-schedule.mjs. Home team is always listed first; finals carry
// scores, upcoming games carry a tip time. Team names match CH_TEAMS exactly
// (modulo punctuation), so teamNameKey() bridges schedule ↔ team ↔ school.
// ---------------------------------------------------------------------------
const SCHEDULE = (SCHEDULE_DATA && SCHEDULE_DATA.games) || [];
const TODAY_ISO = new Date().toISOString().slice(0, 10);

// Normalize a team name to a punctuation-free key for matching (handles curly
// vs straight apostrophes, parentheses, ampersands, etc.).
function teamNameKey(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// All schedule games involving a team (by name), sorted by date then tip time.
function gamesForTeam(teamName) {
  const k = teamNameKey(teamName);
  if (!k) return [];
  return SCHEDULE
    .filter((g) => teamNameKey(g.home) === k || teamNameKey(g.away) === k)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""));
}

// Capitol Hoops team slug for a team name (lets schedule rows deep-link to the
// summer-team page). Returns null if no matching team is loaded.
function chSlugForTeamName(name) {
  const k = teamNameKey(name);
  for (const [slug, t] of Object.entries(CH_TEAMS)) {
    if (teamNameKey(t.name) === k) return slug;
  }
  return null;
}

// Short weekday + month/day label for date headers, e.g. "Thu · May 21".
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function scheduleDayLabel(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAYS[dt.getUTCDay()]} · ${MONTHS_SHORT[m - 1]} ${d}`;
}

let PROSPECT_BY_NAMEKEY = {};

// Canonical high-school name for a Capitol Hoops team (must match the
// cleanup-school-names script that writes prospect.school):
//   - per-slug overrides for fuller/corrected names
//   - "School (VA)" → "School" (state qualifier, not a mascot)
//   - "Mascot (School)" → "School"
//   - plain "School" → "School"
const SCHOOL_CANON = {
  "dematha": "DeMatha Catholic",
  "hawks-hayfield": "Hayfield Secondary",
  "cardozo": "Cardozo",
};
function canonicalSchool(slug, teamName) {
  if (SCHOOL_CANON[slug]) return SCHOOL_CANON[slug];
  const m = String(teamName || "").match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (m) {
    const before = m[1].trim(), paren = m[2].trim();
    if (/^(VA|MD|DC)$/i.test(paren)) return before;
    return paren;
  }
  return String(teamName || "").trim();
}

// Official school name for display (Map labels, school-page title, directory).
// Maps the internal school key → official name from the DMV directory; falls
// back to the key itself. Internal keys, geocode joins, and Capitol Hoops
// Summer League team names are unchanged — this is display-only.
const OFFICIAL_NAMES = (OFFICIAL_SCHOOL_NAMES && OFFICIAL_SCHOOL_NAMES.names) || {};
function officialSchoolName(key) {
  return OFFICIAL_NAMES[key] || key;
}

// Schools, grouped from the prospect list, with coach pulled from the matching
// Capitol Hoops team where derivable.
let SCHOOLS = {};
let SCHOOL_LOCATIONS = {}; // { schoolName: { lat, lng, state, county } }
let DMV_DIRECTORY = [];    // master DMV school directory (scraped from MaxPreps)
let GAME_LOGS = {};        // { nameKey: { name, slug, games:[...] } } — per-game box scores

// Per-game game log for a prospect (matched by name), newest game first.
function gameLogFor(name) {
  const g = GAME_LOGS[nameKey(name)];
  return g && Array.isArray(g.games) ? g.games : [];
}

// Season minutes for a prospect: { min, mpg, g, gs } or null.
function minutesFor(name) {
  const g = GAME_LOGS[nameKey(name)];
  return g && g.season ? g.season : null;
}

// All scraped per-season rows for a prospect (ascending), for the Development Arc.
function seasonsFor(name) {
  const g = GAME_LOGS[nameKey(name)];
  return g && Array.isArray(g.seasons) ? g.seasons : [];
}

// Archetype engine — lazily build the percentile cohort from the live data the
// first time a player page asks for a tag (see docs/metrics-blueprint.md).
let ARCHETYPE_COHORT = null;
function archetypeFor(name, position, level) {
  if (!ARCHETYPE_COHORT) ARCHETYPE_COHORT = buildArchetypeCohort(GAME_LOGS, CH_TEAMS);
  return archetypeForPlayer(name, ARCHETYPE_COHORT, position, level);
}

// Populate the module-level stores from the fetched datasets. Called once,
// before the app renders.
function initData(prospectsData, capitolHoops, schoolLocations) {
  PROSPECTS = (prospectsData && prospectsData.prospects) || [];
  CH_TEAMS = (capitolHoops && capitolHoops.teams) || {};
  SCHOOL_LOCATIONS = schoolLocations || {};

  PROSPECT_BY_NAMEKEY = {};
  for (const p of PROSPECTS) PROSPECT_BY_NAMEKEY[nameKey(p.name)] = p;

  SCHOOLS = {};
  for (const p of PROSPECTS) {
    const s = p.school || "Unknown";
    if (!SCHOOLS[s]) SCHOOLS[s] = { name: s, state: p.state || null, prospects: [] };
    SCHOOLS[s].prospects.push(p);
  }
  for (const [slug, t] of Object.entries(CH_TEAMS)) {
    const s = canonicalSchool(slug, t.name);
    if (SCHOOLS[s]) { SCHOOLS[s].coach = t.headCoach || null; SCHOOLS[s].teamName = t.name; }
  }
  // Backfill state on schools from geocoded locations where missing.
  for (const [name, loc] of Object.entries(SCHOOL_LOCATIONS)) {
    if (SCHOOLS[name] && !SCHOOLS[name].state && loc.state) SCHOOLS[name].state = loc.state;
  }
}

// Summer stat lines for a prospect, pulled from any Capitol Hoops team they
// appear on (by name match). Returned in statLine shape so the profile's
// stats section renders them alongside authored HS/summer/fall lines.
function capitolHoopsLinesFor(prospectName) {
  const key = nameKey(prospectName);
  if (!key) return [];
  const out = [];
  for (const team of Object.values(CH_TEAMS)) {
    for (const pl of team.players || []) {
      if (nameKey(pl.name) === key) {
        out.push({
          context: "Summer (Capitol Hoops)",
          season: team.season,
          team: team.name,
          league: "Capitol Hoops Summer League",
          gp: pl.stats?.gp,
          stats: pl.stats,
        });
      }
    }
  }
  return out;
}

// HS varsity-season stat line for a prospect, pulled from src/data/teamStats.json
// (keyed by school, matched to the player by name). Returned in statLine shape so
// it renders alongside the summer lines — and, because its context is "HS Season",
// primaryStatLine() will prefer it as the headline over small-sample summer data.
function hsSeasonLineFor(prospectName) {
  const key = nameKey(prospectName);
  if (!key) return [];
  const out = [];
  for (const [school, ts] of Object.entries(TEAM_STATS || {})) {
    for (const pl of ts.players || []) {
      if (nameKey(pl.name) !== key) continue;
      const g = pl.gameStats || {};
      const sh = pl.shooting || {};
      if (!pl.gameStats && !pl.shooting) continue;
      out.push({
        context: "HS Season",
        season: ts.season,
        team: school,
        gp: pl.gp,
        stats: {
          gp: pl.gp,
          ppg: g.ppg, rpg: g.rpg, apg: g.apg, spg: g.spg, bpg: g.bpg,
          fgPct: sh.fgPct, threePct: sh.tpPct, ftPct: sh.ftPct,
        },
      });
    }
  }
  return out;
}

// inches → feet-inches display, e.g. 74 → 6'2"
function fmtHeight(inches) {
  if (inches == null) return "—";
  const ft = Math.floor(inches / 12);
  const inch = inches - ft * 12;
  return `${ft}'${inch}"`;
}

// Consistent stat formatting across the whole app.
//   perGame → always 1 decimal (22.0, 3.5, 0.0); null → "—"
//   pct     → 1 decimal + % sign (53.3%); null → "—"
const perGame = (v) => (v == null || v === "" ? "—" : Number(v).toFixed(1));
const fmtCount = (v) => (v == null || v === "" ? "—" : String(Math.round(Number(v)))); // whole-number counts (e.g. GP)
const pct = (v) => (v == null || v === "" ? "—" : `${Number(v).toFixed(1)}%`);
const isPctKey = (k) => k === "fgPct" || k === "threePct" || k === "ftPct";
const fmtStat = (key, v) => (isPctKey(key) ? pct(v) : perGame(v));

function gradeColor(grade) {
  if (grade >= 8) return "var(--prospera-pct-elite)";
  if (grade >= 7) return "var(--prospera-pct-great)";
  if (grade >= 5) return "var(--prospera-pct-avg)";
  if (grade >= 4) return "var(--prospera-pct-below)";
  return "var(--prospera-pct-poor)";
}

function Stars({ count }) {
  if (!count) return <span style={{ color: T.textMute, fontSize: 12 }}>NR</span>;
  return (
    <span style={{ color: T.accent, letterSpacing: "2px", fontSize: 13 }}>
      {"★".repeat(count)}
      <span style={{ color: T.textMute }}>{"★".repeat(Math.max(0, 5 - count))}</span>
    </span>
  );
}

function StatusBadge({ status, commitment }) {
  const map = {
    uncommitted: { label: "UNCOMMITTED", color: T.textMute },
    committed:   { label: commitment ? `COMMITTED · ${commitment.toUpperCase()}` : "COMMITTED", color: T.positive },
    signed:      { label: commitment ? `SIGNED · ${commitment.toUpperCase()}` : "SIGNED", color: T.positive },
  };
  const m = map[status] || map.uncommitted;
  return (
    <span style={{ ...mono, fontSize: 9, letterSpacing: "0.14em", color: m.color, border: `1px solid ${m.color}`, padding: "3px 8px", opacity: 0.9 }}>
      {m.label}
    </span>
  );
}

function Avatar({ name, headshot, size = 56 }) {
  const [errored, setErrored] = useState(false);
  const initials = (name || "").split(/\s+/).map((s) => s[0] || "").join("").slice(0, 2).toUpperCase() || "?";
  const showImg = headshot && !errored;
  return (
    <div
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${T.surface2}, ${T.surface})`,
        border: `1px solid ${T.accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden",
      }}
    >
      {showImg ? (
        <img
          src={headshot}
          alt={name}
          loading="lazy"
          onError={() => setErrored(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block" }}
        />
      ) : (
        <span style={{ ...mono, fontSize: size * 0.32, color: T.accent, fontWeight: 700 }}>{initials}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BOARD — filterable list of prospect cards
// ---------------------------------------------------------------------------
function Board({ onOpen }) {
  const [stateFilter, setStateFilter] = useState("ALL");
  const [classFilter, setClassFilter] = useState("ALL");
  const [query, setQuery] = useState("");

  const classYears = useMemo(
    () => [...new Set(PROSPECTS.map((p) => p.gradYear))].sort(),
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PROSPECTS
      .filter((p) => stateFilter === "ALL" || p.state === stateFilter)
      .filter((p) => classFilter === "ALL" || String(p.gradYear) === classFilter)
      .filter((p) => {
        if (!q) return true;
        return [p.name, p.school, p.position, p.aau, p.commitment].join(" ").toLowerCase().includes(q);
      })
      .sort((a, b) => (a.rankings?.national ?? 999) - (b.rankings?.national ?? 999));
  }, [stateFilter, classFilter, query]);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* Filter bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search prospects, schools, AAU…"
          style={{
            flex: "1 1 260px", background: T.surface2, border: `1px solid ${T.border}`,
            color: T.text, padding: "10px 12px", fontSize: 13, outline: "none",
          }}
        />
        <Segmented value={stateFilter} onChange={setStateFilter} options={[["ALL", "All"], ["DC", "D.C."], ["MD", "MD"], ["VA", "VA"]]} />
        <Segmented
          value={classFilter}
          onChange={setClassFilter}
          options={[["ALL", "All Classes"], ...classYears.map((y) => [String(y), `'${String(y).slice(2)}`])]}
        />
      </div>

      <div style={{ ...mono, fontSize: 10, letterSpacing: "0.16em", color: T.textMute, textTransform: "uppercase" }}>
        {filtered.length} prospect{filtered.length === 1 ? "" : "s"}
      </div>

      {/* Cards */}
      <div style={{ display: "grid", gap: 8 }}>
        {filtered.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onOpen(p.id)}
            style={{
              display: "grid",
              gridTemplateColumns: "44px 56px 1fr auto",
              gap: 14, alignItems: "center", textAlign: "left",
              background: T.surface, border: `1px solid ${T.border}`,
              padding: "12px 16px", cursor: "pointer", color: T.text,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--prospera-accent-border)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--prospera-border)")}
          >
            <div style={{ ...mono, fontSize: 15, color: T.accent, fontWeight: 700 }}>
              {p.rankings?.national ? `#${p.rankings.national}` : "—"}
            </div>
            <Avatar name={p.name} headshot={p.headshot} size={48} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{p.name}</div>
              <div style={{ ...mono, fontSize: 10, color: T.textMute, letterSpacing: "0.08em", marginTop: 3 }}>
                {p.position} · {p.school} · {STATE_LABELS[p.state] || p.state}{classTag(p.gradYear) ? ` · ${classTag(p.gradYear)}` : ""}
              </div>
            </div>
            <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
              <Stars count={p.stars} />
              <StatusBadge status={p.status} commitment={p.commitment} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div style={{ display: "inline-flex", border: `1px solid ${T.border}`, background: T.surface2, flexWrap: "wrap" }}>
      {options.map(([val, label]) => {
        const active = value === val;
        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            style={{
              ...mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase",
              color: active ? T.bg : T.textDim,
              background: active ? T.accent : "transparent",
              border: "none", padding: "7px 11px", fontWeight: active ? 700 : 500,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PROSPECTS — the full searchable database (complements the "coming soon"
// ranked Big Board). State is resolved from the school's geocoded location
// (most prospects carry no explicit state), grad years are normalized, and
// positions are bucketed for filtering. Default sort is summer PPG, since
// authored rankings don't exist yet.
// ---------------------------------------------------------------------------
// A school's geocoded location (with hand-verified overrides) is the
// authoritative source for which state it's physically in, so it wins over the
// prospect's own state field — which can be stale from team-location derivation
// (e.g. Flint Hill players carry "MD" but the school is in Fairfax, VA).
function prospectState(p) {
  return SCHOOL_LOCATIONS[p.school]?.state || p.state || null;
}

function normGradYear(y) {
  if (y == null || y === "") return null;
  const n = Number(y);
  if (Number.isNaN(n)) return null;
  return n < 100 ? 2000 + n : n; // "27" → 2027
}

// The only recruiting classes the site tracks. Anything outside this set
// (graduated, null, or scrape garbage like 2039/"6") is treated as "no class":
// it gets no class tag and never forms its own section.
const ACTIVE_CLASSES = [2027, 2028, 2029, 2030];

// Normalized class tag for display, e.g. 2028 / "28" → "'28"; invalid → null.
function classTag(y) {
  const n = normGradYear(y);
  return n && ACTIVE_CLASSES.includes(n) ? `'${String(n).slice(2)}` : null;
}

function posBucket(pos) {
  const primary = String(pos || "").split("/")[0].trim().toUpperCase();
  if (!primary) return null;
  if (["PG", "SG", "G", "CG", "LG", "GUARD"].includes(primary)) return "G";
  if (["W", "WF", "WING"].includes(primary)) return "W";
  if (primary === "C") return "C";
  if (["F", "SF", "PF", "FF", "FORWARD"].includes(primary)) return "F";
  const c = primary[0];
  if (c === "G") return "G";
  if (c === "W") return "W";
  if (c === "C") return "C";
  if (c === "F" || c === "P" || c === "S") return "F";
  return null;
}

const POS_LABEL = { G: "Guards", W: "Wings", F: "Forwards", C: "Centers" };

function ProspectsDirectory({ onOpen }) {
  const [q, setQ] = useState("");
  const [stateF, setStateF] = useState("ALL");
  const [classF, setClassF] = useState("ALL");
  const [posF, setPosF] = useState("ALL");
  const [sort, setSort] = useState("ppg"); // "ppg" | "name"
  const [limit, setLimit] = useState(60);

  // Enrich every prospect once: a single pass over Capitol Hoops builds a
  // name→best-summer-PPG index (avoids the O(prospects × players) scan that
  // calling capitolHoopsLinesFor per row would cost across 865 prospects).
  const rows = useMemo(() => {
    const summer = {};
    for (const t of Object.values(CH_TEAMS)) {
      for (const pl of t.players || []) {
        const k = nameKey(pl.name);
        const ppg = pl.stats?.ppg;
        if (ppg != null && (summer[k] == null || ppg > summer[k])) summer[k] = ppg;
      }
    }
    return PROSPECTS.map((p) => {
      const authored = Array.isArray(p.statLines)
        ? p.statLines.find((l) => /hs/i.test(l.context || "")) || p.statLines[0]
        : null;
      const ppg = authored?.stats?.ppg != null ? authored.stats.ppg : summer[nameKey(p.name)] ?? null;
      return { p, ppg, st: prospectState(p), yr: normGradYear(p.gradYear), bucket: posBucket(p.position), stars: p.stars ?? null, natl: p.rankings?.national ?? null };
    });
  }, []);

  const classYears = useMemo(
    () => ACTIVE_CLASSES.filter((y) => rows.some((r) => r.yr === y)),
    [rows]
  );

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (stateF !== "ALL" && r.st !== stateF) return false;
      if (classF !== "ALL" && String(r.yr) !== classF) return false;
      if (posF !== "ALL" && r.bucket !== posF) return false;
      if (k && !`${r.p.name} ${r.p.school || ""} ${r.p.position || ""}`.toLowerCase().includes(k)) return false;
      return true;
    });
    const byName = (a, b) => a.p.name.localeCompare(b.p.name);
    const byPpg = (a, b) => (b.ppg ?? -1) - (a.ppg ?? -1) || byName(a, b);
    // Ranked: nationally-ranked players FIRST, in true national order (lower =
    // better); then star-rated players (stars desc); then state rank; then PPG.
    // This guarantees the #N Natl guys lead the board, in the right order.
    const byRanked = (a, b) => {
      const an = a.natl ?? Infinity, bn = b.natl ?? Infinity;
      if (an !== bn) return an - bn;
      const as = a.stars ?? -1, bs = b.stars ?? -1;
      if (as !== bs) return bs - as;
      const ast = a.p.rankings?.state ?? Infinity, bst = b.p.rankings?.state ?? Infinity;
      if (ast !== bst) return ast - bst;
      return byPpg(a, b);
    };
    out.sort(sort === "name" ? byName : sort === "ranked" ? byRanked : byPpg);
    return out;
  }, [rows, q, stateF, classF, posF, sort]);

  useEffect(() => { setLimit(60); }, [q, stateF, classF, posF, sort]);

  const shown = filtered.slice(0, limit);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <SectionLabel>Prospects</SectionLabel>
        <p style={{ fontSize: 13, color: T.textDim, lineHeight: 1.5, margin: "8px 0 0", maxWidth: 640 }}>
          The full DMV database — every tracked player across {PROSPECTS.length} profiles. Search and
          filter by state, class, or position; tap any name to open their profile. Ranked Big Board coming soon.
        </p>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search players or schools…"
          style={{ flex: "1 1 240px", background: T.surface2, border: `1px solid ${T.border}`, color: T.text, padding: "10px 12px", fontSize: 13, outline: "none" }}
        />
        <Segmented value={stateF} onChange={setStateF} options={[["ALL", "All"], ["DC", "D.C."], ["MD", "MD"], ["VA", "VA"]]} />
        <Segmented value={posF} onChange={setPosF} options={[["ALL", "All Pos"], ["G", "G"], ["W", "W"], ["F", "F"], ["C", "C"]]} />
        <Segmented value={classF} onChange={setClassF} options={[["ALL", "All Classes"], ...classYears.map((y) => [String(y), `'${String(y).slice(2)}`])]} />
        <Segmented value={sort} onChange={setSort} options={[["ppg", "PPG"], ["ranked", "Ranked"], ["name", "A–Z"]]} />
      </div>

      <div style={{ ...mono, fontSize: 10, letterSpacing: "0.16em", color: T.textMute, textTransform: "uppercase" }}>
        {filtered.length} prospect{filtered.length === 1 ? "" : "s"}
      </div>

      {/* Cards */}
      <div style={{ display: "grid", gap: 8 }}>
        {shown.map(({ p, ppg, st, stars, natl }) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onOpen(p.id)}
            style={{ display: "grid", gridTemplateColumns: "44px 1fr auto", gap: 14, alignItems: "center", textAlign: "left", background: T.surface, border: `1px solid ${T.border}`, padding: "10px 16px", cursor: "pointer", color: T.text }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--prospera-accent-border)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--prospera-border)")}
          >
            <Avatar name={p.name} headshot={p.headshot} size={40} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text, display: "flex", alignItems: "center", gap: 8 }}>
                {p.name}
                {stars ? <Stars count={stars} /> : null}
              </div>
              <div style={{ ...mono, fontSize: 10, color: T.textMute, letterSpacing: "0.06em", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {p.position || "—"} · {p.school}{st ? ` · ${st}` : ""}{classTag(p.gradYear) ? ` · ${classTag(p.gradYear)}` : ""}
              </div>
            </div>
            <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
              {natl ? (
                <span style={{ ...mono, fontSize: 12, color: T.accent, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>#{natl} Natl</span>
              ) : (
                <span style={{ ...mono, fontSize: 13, color: ppg != null ? T.accent : T.textMute, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {ppg != null ? `${perGame(ppg)} PPG` : "—"}
                </span>
              )}
              {(p.status === "committed" || p.status === "signed") && p.commitment ? (
                <span style={{ ...mono, fontSize: 9, letterSpacing: "0.08em", color: T.positive }}>→ {p.commitment}</span>
              ) : null}
            </div>
          </button>
        ))}
      </div>

      {filtered.length > limit ? (
        <button
          type="button"
          onClick={() => setLimit((l) => l + 60)}
          style={{ ...mono, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: T.signal, background: "transparent", border: `1px solid ${T.border}`, padding: "12px", cursor: "pointer", justifySelf: "center", width: "100%" }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--prospera-accent-border)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--prospera-border)")}
        >
          Show more · {filtered.length - limit} remaining
        </button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PROFILE — editorial player card + tabs
// ---------------------------------------------------------------------------
const PROFILE_TABS = ["Overview", "Film"];

// Real percentile context from the Capitol Hoops player pool — NOT fabricated.
// Built once, lazily, after initData() populates CH_TEAMS. Lets the editorial
// card show measured ranks (projected:false) instead of invented percentiles.
const _chCohort = {};
function chCohort(level = "Summer") {
  if (_chCohort[level]) return _chCohort[level];
  const cols = { ppg: [], apg: [], spg: [], threePct: [] };
  let n = 0;
  for (const team of Object.values(CH_TEAMS)) {
    if ((team.level || "Summer") !== level) continue;   // rank within the same context only
    for (const pl of team.players || []) {
      const s = pl.stats || {};
      if (!(s.gp > 0)) continue;
      n++;
      for (const k of Object.keys(cols)) if (s[k] != null) cols[k].push(s[k]);
    }
  }
  for (const k of Object.keys(cols)) cols[k].sort((a, b) => a - b);
  _chCohort[level] = { cols, n };
  return _chCohort[level];
}
function pctileRank(arr, v) {
  if (!arr || !arr.length || v == null) return null;
  let c = 0;
  for (const x of arr) { if (x <= v) c++; else break; } // arr is sorted ascending
  return Math.max(1, Math.min(99, Math.round((c / arr.length) * 100)));
}

// Map a tracked prospect (+ joined stat lines) into the PlayerProfileCard shape.
// Only real/derivable facts are written; evaluative fields stay null so the card
// renders its "in progress" states rather than inventing scouting copy.
function mapProspectToCard(p) {
  const hsLine = hsSeasonLineFor(p.name)[0] || null;
  const summerLine = capitolHoopsLinesFor(p.name)[0] || null;
  const hsS = hsLine?.stats || null;
  const suS = summerLine?.stats || null;
  const hasHS = !!(hsS && (hsS.ppg != null || hsS.rpg != null || hsS.apg != null));
  const hasSummer = !!(suS && suS.gp > 0);
  const delta = (a, b) => (a != null && b != null ? +(a - b).toFixed(1) : null);

  let trajectory = null;
  if (hasHS || hasSummer) {
    trajectory = {
      hsSampleN: hsLine?.gp ?? hsS?.gp ?? null,
      summerSampleN: summerLine?.gp ?? suS?.gp ?? null,
      hs: hasHS ? { pts: hsS.ppg, reb: hsS.rpg, ast: hsS.apg } : null,
      summer: hasSummer ? {
        pts: suS.ppg, reb: suS.rpg, ast: suS.apg,
        dPts: delta(suS.ppg, hsS?.ppg), dReb: delta(suS.rpg, hsS?.rpg), dAst: delta(suS.apg, hsS?.apg),
      } : null,
      note: hasHS && hasSummer && suS.gp <= 2 ? "Small summer sample — directional, not predictive." : null,
    };
  }

  // Production-in-context: measured percentiles vs the summer pool.
  let context = null;
  if (hasSummer) {
    const { cols, n } = chCohort("Summer");
    const rows = [];
    const add = (key, detail, statKey, watchIfLow) => {
      const pr = pctileRank(cols[statKey], suS[statKey]);
      if (pr == null) return;
      rows.push({ key, detail, percentile: pr, tone: watchIfLow && pr < 35 ? "watch" : "normal" });
    };
    add("Scoring", `${perGame(suS.ppg)} PPG`, "ppg", false);
    add("Playmaking", `${perGame(suS.apg)} APG`, "apg", false);
    add("Perimeter shot", `${pct(suS.threePct)} 3P%`, "threePct", true);
    add("Event steals", `${perGame(suS.spg)} SPG`, "spg", false);
    if (rows.length) context = { cohortLabel: `vs summer-league players · n=${n}`, projected: false, rows };
  }

  const statusLabel = p.commitment
    ? `Committed · ${p.commitment}`
    : (p.status ? p.status.charAt(0).toUpperCase() + p.status.slice(1) : null);

  return {
    name: p.name,
    position: p.position || null,
    classYear: normGradYear(p.gradYear) || null,
    height: p.heightInches != null ? fmtHeight(p.heightInches) : null,
    weight: p.weightLbs ? `${p.weightLbs} lb` : null,
    youngForClass: false,
    school: p.school || null,
    city: p.city || null,
    state: p.state || null,
    status: statusLabel,
    watchlistTier: "DMV Database",
    source: hasSummer ? "Capitol Hoops" : null,
    photo: p.headshot || null,
    updatedCount: null,
    snapshot: p.summary || null,
    trajectory,
    scoutView: null,
    context,
    intel: {
      circuit: p.aau || summerLine?.team || null,
      district: p.county ? `${p.county}${p.state ? " · " + (STATE_LABELS[p.state] || p.state) : ""}` : (p.state ? (STATE_LABELS[p.state] || p.state) : null),
      ageRelClass: null,
      frameUpside: null,
    },
  };
}

// Related players — other prospects sharing this player's high school, AAU club,
// or graduating class. A discovery surface (and a breadth signal): the DMV is
// connected, not a list of isolated five-stars.
function RelatedPlayers({ prospect, onOpen }) {
  const [rel, setRel] = useState("school");
  const tabs = [["school", "Same school"]];
  if (prospect.aau) tabs.push(["aau", prospect.aau]);
  tabs.push(["class", `Class of ${normGradYear(prospect.gradYear) || "—"}`]);

  const pool = useMemo(() => {
    const others = PROSPECTS.filter((x) => x.id !== prospect.id);
    let list;
    if (rel === "aau") list = others.filter((x) => x.aau && x.aau === prospect.aau);
    else if (rel === "class") list = others.filter((x) => normGradYear(x.gradYear) && normGradYear(x.gradYear) === normGradYear(prospect.gradYear));
    else list = others.filter((x) => x.school && x.school === prospect.school);
    return list
      .map((x) => ({ x, ppg: primaryStatLine(x)?.stats?.ppg ?? null }))
      .sort((a, b) => (b.ppg ?? -1) - (a.ppg ?? -1))
      .slice(0, 10);
  }, [rel, prospect]);

  if (!PROSPECTS.length) return null;
  const emptyLabel = rel === "school" ? "at this school" : rel === "aau" ? "on this club" : "in this class";

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: 18 }}>
      <SectionLabel>Related Players</SectionLabel>
      <div style={{ display: "flex", gap: 8, margin: "12px 0", flexWrap: "wrap" }}>
        {tabs.map(([k, l]) => {
          const active = rel === k;
          return (
            <button key={k} type="button" onClick={() => setRel(k)} style={{
              ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: active ? 700 : 500,
              color: active ? T.bg : T.textDim, background: active ? T.accent : "transparent",
              border: `1px solid ${active ? T.accent : T.border}`, padding: "6px 11px", cursor: "pointer",
            }}>{l}</button>
          );
        })}
      </div>
      {pool.length === 0 ? (
        <div style={{ fontSize: 13, color: T.textMute }}>No other players {emptyLabel} in the database yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {pool.map(({ x, ppg }) => (
            <button key={x.id} type="button" onClick={() => onOpen(x.id)} style={{
              display: "grid", gridTemplateColumns: "34px 1fr auto", gap: 12, alignItems: "center", textAlign: "left",
              background: T.surface2, border: `1px solid ${T.borderSoft}`, padding: "8px 12px", cursor: "pointer", color: T.text,
            }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--prospera-accent-border)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--prospera-border-soft)")}>
              <Avatar name={x.name} headshot={x.headshot} size={34} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{x.name}</div>
                <div style={{ ...mono, fontSize: 10, color: T.textMute, letterSpacing: "0.04em", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {[
                    x.position || "—",
                    normGradYear(x.gradYear) ? `'${String(normGradYear(x.gradYear)).slice(2)}` : null,
                    x.heightInches ? fmtHeight(x.heightInches) : null,
                    x.weightLbs ? `${x.weightLbs} lb` : null,
                    rel !== "school" ? x.school : null,
                  ].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div style={{ ...mono, fontSize: 12, color: ppg != null ? T.accent : T.textMute, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {ppg != null ? `${perGame(ppg)} ppg` : "—"}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Claim a profile --------------------------------------------------------
// Where claims are routed. Set CLAIM_ENDPOINT to a form backend (Formspree,
// Tally, Getform, etc.) to collect submissions in a dashboard; otherwise it
// falls back to a prefilled email to CLAIM_EMAIL (zero setup). Claims are
// reviewed by the owner, who then verifies the player (the ✓ Verify control) —
// there's no auto-edit, which is the right posture for confirming minors.
const CLAIM_ENDPOINT = ""; // e.g. "https://formspree.io/f/xxxxxxx"  ← paste yours
const CLAIM_EMAIL = "claims@prosperahoops.com"; // ← change to your inbox

function ClaimForm({ prospect, onClose }) {
  const [f, setF] = useState({ role: "Player", name: "", email: "", phone: "", proof: "", message: "" });
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const inputStyle = { ...mono, fontSize: 13, color: T.text, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "9px 11px", width: "100%", outline: "none" };

  async function submit(e) {
    e.preventDefault();
    if (!f.name.trim() || !f.email.trim()) return;
    const payload = { player: prospect.name, playerId: prospect.id, school: prospect.school || null, ...f, submittedFrom: "prospera-hoops/profile" };
    if (CLAIM_ENDPOINT) {
      setState("sending");
      try {
        const r = await fetch(CLAIM_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
        setState(r.ok ? "sent" : "error");
      } catch { setState("error"); }
    } else {
      // zero-backend fallback: open a prefilled email to the owner.
      const subject = `Profile claim: ${prospect.name}`;
      const body = `Player: ${prospect.name}${prospect.school ? ` (${prospect.school})` : ""}\nClaimant: ${f.name} — ${f.role}\nEmail: ${f.email}\nPhone: ${f.phone}\nProof (IG / link): ${f.proof}\n\n${f.message}`;
      window.location.href = `mailto:${CLAIM_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      setState("sent");
    }
  }

  if (state === "sent") {
    return (
      <div style={{ background: "var(--prospera-accent-bg-faint)", border: `1px solid ${T.positive}`, padding: 16, display: "grid", gap: 6 }}>
        <div style={{ ...mono, fontSize: 10, letterSpacing: "0.14em", color: T.positive, textTransform: "uppercase", fontWeight: 700 }}>Claim submitted ✓</div>
        <div style={{ fontSize: 13, color: T.textDim, lineHeight: 1.6, maxWidth: 640 }}>
          Thanks — we'll verify it's really {prospect.name} and unlock editing (add film, fix info). You'll hear back at {f.email || "your email"}.
        </div>
        <button type="button" onClick={onClose} style={{ ...mono, fontSize: 11, color: T.signal, background: "transparent", border: "none", justifySelf: "start", padding: "4px 0", cursor: "pointer" }}>Close</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ background: "var(--prospera-accent-bg-faint)", border: `1px dashed ${T.border}`, padding: 16, display: "grid", gap: 10 }}>
      <div style={{ ...mono, fontSize: 10, letterSpacing: "0.14em", color: T.accent, textTransform: "uppercase", fontWeight: 700 }}>Claim this profile</div>
      <div style={{ fontSize: 13, color: T.textDim, lineHeight: 1.55, maxWidth: 640 }}>
        Are you {prospect.name}, a parent, or their coach? Submit a claim — once we verify it's you, you can add film, fix your info, and own your recruiting page. <b style={{ color: T.textDim }}>We don't build it for you; you do.</b>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
        <select value={f.role} onChange={set("role")} style={inputStyle}>
          <option>Player</option><option>Parent / guardian</option><option>Coach</option>
        </select>
        <input style={inputStyle} placeholder="Your name *" value={f.name} onChange={set("name")} required />
        <input style={inputStyle} type="email" placeholder="Email *" value={f.email} onChange={set("email")} required />
        <input style={inputStyle} placeholder="Phone (optional)" value={f.phone} onChange={set("phone")} />
      </div>
      <input style={inputStyle} placeholder="Proof it's you — your IG handle or a link" value={f.proof} onChange={set("proof")} />
      <textarea style={{ ...inputStyle, minHeight: 64, resize: "vertical" }} placeholder="Anything to add (optional)" value={f.message} onChange={set("message")} />
      {state === "error" && <div style={{ ...mono, fontSize: 11, color: T.danger }}>Couldn't send — try again, or email {CLAIM_EMAIL}.</div>}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button type="submit" disabled={state === "sending"} style={{ ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, color: T.bg, background: T.accent, border: "none", borderRadius: 6, padding: "9px 16px", cursor: "pointer" }}>
          {state === "sending" ? "Sending…" : "Submit claim"}
        </button>
        <button type="button" onClick={onClose} style={{ ...mono, fontSize: 11, color: T.textDim, background: "transparent", border: "none", cursor: "pointer" }}>Cancel</button>
      </div>
      <div style={{ ...mono, fontSize: 9, letterSpacing: "0.06em", color: T.textMute }}>Reviewed by Prospera Hoops — we verify before any profile is edited.</div>
    </form>
  );
}

// Copy a shareable deep-link to this profile (the recruiting-utility unlock:
// a coach/player can text a live page).
function ShareButton({ name }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const url = `${window.location.origin}/player/${nameKey(name)}`;
    try { await navigator.clipboard.writeText(url); }
    catch { const ta = document.createElement("textarea"); ta.value = url; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch {} ta.remove(); }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button type="button" onClick={copy} title="Copy a shareable link to this profile"
      style={{ ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, borderRadius: 6, padding: "7px 12px", cursor: "pointer", color: copied ? T.bg : T.signal, background: copied ? T.positive : "transparent", border: `1px solid ${copied ? T.positive : "rgba(56,189,248,0.5)"}` }}>
      {copied ? "Link copied ✓" : "↗ Share"}
    </button>
  );
}

// --- Scout-dashboard profile pieces ----------------------------------------
const SLATE = "#5A646E";

// Sticky identity rail (left column on desktop, top block on mobile).
function ProfileRail({ c, archetype, tiles, status }) {
  const initials = (c.name || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const measur = [["POS", c.position], ["CLASS", c.classYear ? `'${String(c.classYear).slice(2)}` : null], ["HT", c.height], ["WT", c.weight], ["WING", c.wingspan]];
  const uncommitted = /uncommit/i.test(status || "");
  return (
    <aside style={{ display: "grid", gap: 14, alignContent: "start" }}>
      <div style={{ aspectRatio: "4 / 5", borderRadius: 10, overflow: "hidden", border: `1px solid ${T.border}`, background: c.photo ? "#000" : "#1B2129", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {c.photo ? <img src={c.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ ...serif, fontSize: 72, fontWeight: 800, color: T.textMute, letterSpacing: "0.02em" }}>{initials}</span>}
      </div>
      <div>
        <h1 style={{ ...serif, fontSize: 32, fontWeight: 800, textTransform: "uppercase", lineHeight: 1.02, color: T.text, margin: 0 }}>{c.name}</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
          {archetype?.label && <span style={{ ...serif, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700, color: T.accent, border: `1px solid ${T.accent}`, borderRadius: 999, padding: "4px 11px" }}>{archetype.label}</span>}
          {archetype?.earlyRead && <span style={{ ...mono, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, color: T.accent }}>Early Read · {archetype.gp} GP</span>}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1, background: T.border, border: `1px solid ${T.border}` }}>
        {measur.map(([l, v]) => (
          <div key={l} style={{ background: T.surface, padding: "8px 4px", textAlign: "center" }}>
            <div style={{ ...mono, fontSize: 8.5, letterSpacing: "0.08em", color: T.textMute, textTransform: "uppercase" }}>{l}</div>
            <div style={{ ...serif, fontSize: 15, fontWeight: 700, color: T.text, marginTop: 2 }}>{v || "—"}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {[["PPG", tiles.ppg, true], ["RPG", tiles.rpg, false], ["APG", tiles.apg, false]].map(([l, v, hot]) => (
          <div key={l} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 6px", textAlign: "center" }}>
            <div style={{ ...serif, fontSize: 28, fontWeight: 800, color: hot ? T.accent : T.text, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{v ?? "—"}</div>
            <div style={{ ...mono, fontSize: 9, letterSpacing: "0.12em", color: T.textMute, textTransform: "uppercase", marginTop: 6 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ ...mono, fontSize: 12, color: T.textDim, lineHeight: 1.5 }}>
        {[c.school, [c.city, c.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
        {status && <> · <span style={{ color: uncommitted ? T.accent : T.textDim, fontWeight: 600 }}>{status}</span></>}
      </div>
      {(c.intel?.circuit || c.intel?.district) && (
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
          <SectionLabel>DMV Intel</SectionLabel>
          <div style={{ ...mono, fontSize: 12, color: T.textDim, marginTop: 8 }}>{[c.intel.circuit, c.intel.district].filter(Boolean).join(" · ")}</div>
        </div>
      )}
    </aside>
  );
}

// Production in Context — percentile bars vs the summer pool. Orange ≥75, slate
// below; low bars always render (don't hide weaknesses).
function PercentileBars({ context }) {
  if (!context || !context.rows?.length) return null;
  return (
    <section style={{ background: T.surface, border: `1px solid ${T.border}`, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <SectionLabel>Production in Context</SectionLabel>
        <span style={{ ...mono, fontSize: 11, color: T.textMute }}>{context.cohortLabel}</span>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {context.rows.map((r) => {
          const col = r.percentile >= 75 ? T.accent : SLATE;
          return (
            <div key={r.key} style={{ display: "grid", gap: 5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ ...mono, fontSize: 11.5, color: T.textDim }}><b style={{ color: T.text, fontWeight: 700 }}>{r.key}</b> · {r.detail}</span>
                <span style={{ ...serif, fontSize: 13, fontWeight: 700, color: col, fontVariantNumeric: "tabular-nums" }}>{r.percentile}th</span>
              </div>
              <div style={{ height: 7, background: "var(--prospera-pct-track)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${Math.max(2, r.percentile)}%`, height: "100%", background: col, borderRadius: 4 }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// The Leap — prior-season → summer averages with +deltas in orange.
function TheLeap({ trajectory: t }) {
  if (!t || !t.summer) return null;
  const f1 = (v) => (v == null ? "—" : Number(v).toFixed(1));
  const rows = [["PTS", t.hs?.pts, t.summer.pts, t.summer.dPts], ["REB", t.hs?.reb, t.summer.reb, t.summer.dReb], ["AST", t.hs?.ast, t.summer.ast, t.summer.dAst]];
  return (
    <section style={{ background: T.surface, border: `1px solid ${T.border}`, padding: 18 }}>
      <SectionLabel>The Leap</SectionLabel>
      <div style={{ ...mono, fontSize: 10.5, color: T.textMute, margin: "4px 0 12px" }}>
        prior season{t.hsSampleN ? ` · n=${t.hsSampleN}` : ""} → summer{t.summerSampleN ? ` · n=${t.summerSampleN}` : ""}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {rows.map(([l, hs, su, d]) => (
          <div key={l} style={{ display: "grid", gridTemplateColumns: "48px 1fr 1fr 60px", gap: 8, alignItems: "center" }}>
            <span style={{ ...mono, fontSize: 10, letterSpacing: "0.1em", color: T.textMute, textTransform: "uppercase" }}>{l}</span>
            <span style={{ ...serif, fontSize: 18, fontWeight: 700, color: T.textDim, fontVariantNumeric: "tabular-nums" }}>{f1(hs)}</span>
            <span style={{ ...serif, fontSize: 18, fontWeight: 800, color: T.text, fontVariantNumeric: "tabular-nums" }}>{f1(su)}</span>
            <span style={{ ...serif, fontSize: 13, fontWeight: 700, color: d > 0 ? T.accent : T.textMute, fontVariantNumeric: "tabular-nums" }}>{d == null ? "" : d > 0 ? `+${f1(d)}` : f1(d)}</span>
          </div>
        ))}
      </div>
      {t.note && <div style={{ ...mono, fontSize: 10.5, color: T.textMute, marginTop: 10 }}>{t.note}</div>}
    </section>
  );
}

function Profile({ prospect, onBack, onOpen }) {
  const [tab, setTab] = useState("Overview");
  const [claimOpen, setClaimOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [override, setOverride] = useState(null);
  const [myClaim, setMyClaim] = useState(null);
  const p = prospect;
  const cardPlayer = useMemo(() => mapProspectToCard(p), [p]);
  const arc = useMemo(() => buildArc(seasonsFor(p.name), p), [p]);
  const archetype = useMemo(() => archetypeFor(p.name, p.position), [p]);
  const narrow = useIsMobile(900);
  const tiles = useMemo(() => {
    const games = gameLogFor(p.name);
    if (!games.length) return {};
    const byLevel = {};
    for (const g of games) { const lv = g.level || "Summer"; (byLevel[lv] ||= []).push(g); }
    const order = Object.keys(byLevel).sort((a, b) => (LEVEL_WEIGHT[b] || 0) - (LEVEL_WEIGHT[a] || 0));
    const line = seasonStatLine(byLevel[order[0]]);
    return line ? { ppg: line.per.ppg, rpg: line.per.rpg, apg: line.per.apg, spg: line.per.spg } : {};
  }, [p]);
  const gold = useGold();
  const ver = useVerified();
  const auth = useAuth();
  const marked = gold.isGold(p.id);
  const verified = ver.isVerified(p.id);
  const canEdit = myClaim?.status === "approved";

  // Load the public overlay (any player) + this user's claim (so we know whether
  // to show "Edit my profile"). Only runs when Supabase is configured.
  const reloadOverlay = React.useCallback(() => {
    if (!supabaseConfigured) return;
    getOverride(p.id).then(setOverride).catch(() => setOverride(null));
  }, [p.id]);
  useEffect(() => {
    setOverride(null); setMyClaim(null); setEditOpen(false); setClaimOpen(false);
    if (!supabaseConfigured) return;
    reloadOverlay();
    if (auth.user) myClaimForPlayer(p.id).then(setMyClaim).catch(() => setMyClaim(null));
  }, [p.id, auth.user, reloadOverlay]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "minmax(270px, 33%) 1fr", gap: narrow ? 18 : 28, alignItems: "start" }}>
      {/* LEFT RAIL — identity / measurables / stat tiles / DMV intel (sticky on desktop) */}
      <div style={{ position: narrow ? "static" : "sticky", top: 16 }}>
        <ProfileRail c={cardPlayer} archetype={archetype} tiles={tiles} status={cardPlayer.status} />
      </div>

      {/* RIGHT COLUMN — action bar, tabs, content */}
      <div style={{ display: "grid", gap: 18, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onBack}
          style={{ ...mono, fontSize: 12, letterSpacing: "0.14em", color: T.signal, background: "transparent", border: "none", textTransform: "uppercase", padding: "4px 0" }}
        >
          ← Back
        </button>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ShareButton name={p.name} />
          {/* Scout-side verification — internal trust signal on the system of record.
              The public player/parent "claim" flow needs accounts + a backend (owner-decision). */}
          <button
            type="button"
            onClick={() => ver.toggleVerified(p.id)}
            title="Scout-verified: a Prospera scout has confirmed this player's info. (Public profile claiming needs accounts — coming later.)"
            style={{
              ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700,
              borderRadius: 6, padding: "7px 12px", cursor: "pointer",
              color: verified ? T.bg : T.positive,
              background: verified ? T.positive : "transparent",
              border: `1px solid ${verified ? T.positive : "rgba(16,185,129,0.5)"}`,
            }}
          >
            {verified ? "✓ Verified" : "Verify Player"}
          </button>
          {/* In-app manual gold-tier mark — the user's "this kid is elite" conviction. */}
          <button
            type="button"
            onClick={() => gold.toggleGold(p.id)}
            title="Gold tier is your manual apex mark; saved on this device."
            style={{
              ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700,
              borderRadius: 6, padding: "7px 12px", cursor: "pointer",
              color: marked ? "#2a2410" : "#d2af52",
              background: marked ? "linear-gradient(135deg,#f1e3a8 0%,#d2af52 55%,#a9842f 100%)" : "transparent",
              border: `1px solid ${marked ? "transparent" : "rgba(210,175,82,0.5)"}`,
              boxShadow: marked ? "inset 0 1px 0 rgba(255,255,255,0.45)" : "none",
            }}
          >
            {marked ? "♛ Gold Tier ✓" : "♛ Mark Gold Tier"}
          </button>
          {/* Player-facing controls. With Supabase configured this is a real
              claim → owner-approve → self-edit flow; without it, the button
              opens the email-based claim request form (honest fallback). */}
          {canEdit ? (
            <button
              type="button"
              onClick={() => setEditOpen((v) => !v)}
              title="You own this profile — edit your bio, film, and info."
              style={{ ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, borderRadius: 6, padding: "7px 12px", cursor: "pointer", color: T.bg, background: T.accent, border: `1px solid ${T.accent}` }}
            >
              Edit my profile
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setClaimOpen((v) => !v)}
              title="Player or parent? Claim & verify this profile."
              style={{ ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, borderRadius: 6, padding: "7px 12px", cursor: "pointer", color: T.textDim, background: "transparent", border: `1px solid ${T.border}` }}
            >
              Claim profile
            </button>
          )}
        </div>
      </div>

      {editOpen && canEdit && (
        <ProfileEditor prospect={p} onClose={() => setEditOpen(false)} onSaved={reloadOverlay} />
      )}
      {claimOpen && (
        supabaseConfigured
          ? <ClaimPanel prospect={p} onClose={() => setClaimOpen(false)} onClaimed={() => myClaimForPlayer(p.id).then(setMyClaim).catch(() => {})} />
          : <ClaimForm prospect={p} onClose={() => setClaimOpen(false)} />
      )}

      {/* Player-maintained overlay (public, contact-masked server-side). */}
      {override && <ClaimedOverlay override={override} />}

      {/* Tabs — Game Log appears only when we have per-game box scores. */}
      <div style={{ display: "flex", borderBottom: `1px solid ${T.border}` }}>
        {["Overview", ...(arc.seasons.length ? ["Development"] : []), ...(gameLogFor(p.name).length ? ["Game Log"] : []), "Film"].map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                ...mono, fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase",
                color: active ? T.accent : T.textDim, background: "transparent", border: "none",
                padding: "14px 20px", borderBottom: `2px solid ${active ? T.accent : "transparent"}`,
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {tab === "Overview" && (
        <div style={{ display: "grid", gap: 18 }}>
          {/* Scout dashboard: snapshot → production-in-context → the leap.
              (Identity/measurables live in the left rail.) */}
          <section style={{ borderLeft: `3px solid ${T.accent}`, paddingLeft: 16 }}>
            <SectionLabel>Scout Snapshot</SectionLabel>
            <p style={{ ...mono, fontSize: 14.5, lineHeight: 1.6, color: cardPlayer.snapshot ? T.textDim : T.textMute, fontStyle: cardPlayer.snapshot ? "normal" : "italic", margin: "8px 0 0", maxWidth: "70ch" }}>
              {cardPlayer.snapshot || "Scouting report in progress — the stats below are real where available."}
            </p>
          </section>
          <PercentileBars context={cardPlayer.context} />
          <TheLeap trajectory={cardPlayer.trajectory} />

          {/* v1 deep stat line, SPLIT BY COMPETITION so contexts never blend.
              HS first (weighted most); summer league flagged lighter (exhibition). */}
          {(() => {
            const allGames = gameLogFor(p.name);
            if (!allGames.length) return null;
            const byLevel = {};
            for (const g of allGames) { const lv = g.level || "Summer"; (byLevel[lv] ||= []).push(g); }
            const order = Object.keys(byLevel).sort((a, b) => (LEVEL_WEIGHT[b] || 0) - (LEVEL_WEIGHT[a] || 0));
            return (
              <div style={{ display: "grid", gap: 16 }}>
                {order.length > 1 && (
                  <div style={{ ...mono, fontSize: 12, color: T.textDim, lineHeight: 1.5, background: "var(--prospera-accent-bg-faint)", border: `1px solid ${T.border}`, padding: "10px 14px", borderRadius: 8 }}>
                    Stats are split by competition so they don't blend. <b style={{ color: T.text }}>High school</b> carries the most evaluative weight; summer league is lighter (exhibition).
                  </div>
                )}
                {order.map((lv) => {
                  const arch = archetypeFor(p.name, p.position, lv);
                  return (
                    <div key={lv} style={{ display: "grid", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ ...mono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, color: T.accent, border: `1px solid ${T.accent}`, borderRadius: 4, padding: "2px 7px" }}>{lv}</span>
                        <span style={{ ...mono, fontSize: 12, color: T.textDim, fontWeight: 600 }}>{LEVEL_LABEL[lv] || lv}</span>
                        <span style={{ ...mono, fontSize: 10.5, color: T.textMute }}>{LEVEL_NOTE[lv] || ""}</span>
                        {arch && arch.label && <span style={{ ...mono, fontSize: 10.5, color: T.accent, fontWeight: 700 }}>· {arch.label}</span>}
                      </div>
                      <StatLine games={byLevel[lv]} />
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Real authored data the card doesn't cover, kept below it. */}
          <RecruitingBlock p={p} />

          {Array.isArray(p.offers) && p.offers.length > 0 && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: 18 }}>
              <SectionLabel>Offers</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {p.offers.map((o) => {
                  const committed = p.commitment && o === p.commitment;
                  return (
                    <span key={o} style={{
                      ...mono, fontSize: 12, letterSpacing: "0.06em",
                      color: committed ? T.bg : T.textDim,
                      background: committed ? T.positive : "transparent",
                      border: `1px solid ${committed ? T.positive : T.border}`,
                      padding: "6px 11px",
                    }}>
                      {o}{committed ? " ✓" : ""}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <RelatedPlayers prospect={p} onOpen={onOpen} />
        </div>
      )}
      {tab === "Development" && <DevelopmentSection arc={arc} prospect={p} />}
      {tab === "Game Log" && <GameLogTab name={p.name} />}
      {tab === "Film" && <ProspectFilm prospectName={p.name} />}
      </div>
    </div>
  );
}

// Per-game game log — the longitudinal box-score view. Real per-game lines
// scraped from the player's Capitol Hoops page (scripts/scrape-player-gamelogs).
function GameLogTab({ name }) {
  const games = gameLogFor(name);
  if (!games.length) return <div style={{ ...mono, fontSize: 12, color: T.textMute, padding: 20 }}>No game log available yet.</div>;
  const COLS = [
    ["pts", "PTS"], ["reb", "REB"], ["ast", "AST"], ["stl", "STL"], ["blk", "BLK"], ["to", "TO"],
  ];
  const fmtShot = (m, a) => (a ? `${m ?? 0}-${a ?? 0}` : "—");
  const avg = (k) => (games.reduce((s, g) => s + (g[k] || 0), 0) / games.length).toFixed(1);
  const th = { ...mono, fontSize: 10, letterSpacing: "0.1em", color: T.textMute, textTransform: "uppercase", padding: "8px 10px", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" };
  const td = { ...mono, fontSize: 12, color: T.text, padding: "8px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums" };
  const mins = minutesFor(name);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {mins ? (
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", background: T.surface, border: `1px solid ${T.border}`, padding: "12px 16px" }}>
          {[["MPG", perGame(mins.mpg)], ["Total Min", fmtCount(mins.min)], ["GP", fmtCount(mins.g)], ["GS", mins.gs != null ? fmtCount(mins.gs) : "—"]].map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: 22, color: l === "MPG" ? T.accent : T.text, fontWeight: 800, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{v}</div>
              <div style={{ ...mono, fontSize: 9, letterSpacing: "0.14em", color: T.textMute, textTransform: "uppercase", marginTop: 5 }}>{l}</div>
            </div>
          ))}
        </div>
      ) : null}
      <div style={{ ...mono, fontSize: 9, color: T.textMute, letterSpacing: "0.06em" }}>
        {games.length} game{games.length === 1 ? "" : "s"} · per-game box scores
      </div>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", ...mono, fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              <th style={{ ...th, textAlign: "left" }}>Date</th>
              <th style={{ ...th, textAlign: "left" }}>Opponent</th>
              <th style={{ ...th, textAlign: "left" }}>Result</th>
              {COLS.map(([k, l]) => <th key={k} style={{ ...th, color: k === "pts" ? T.accent : T.textMute }}>{l}</th>)}
              <th style={th}>FG</th><th style={th}>3P</th><th style={th}>FT</th>
            </tr>
          </thead>
          <tbody>
            {games.map((g, i) => {
              const win = /^w/i.test(g.result || "");
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${T.borderSoft}`, background: i % 2 ? "var(--prospera-surface-2)" : "transparent" }}>
                  <td style={{ ...td, textAlign: "left", color: T.textDim, whiteSpace: "nowrap" }}>{g.date}</td>
                  <td style={{ ...td, textAlign: "left", color: T.text, whiteSpace: "nowrap" }}>{g.opp || "—"}</td>
                  <td style={{ ...td, textAlign: "left", color: win ? T.positive : T.textDim, whiteSpace: "nowrap" }}>{g.result || "—"}</td>
                  {COLS.map(([k]) => <td key={k} style={{ ...td, color: k === "pts" ? T.accent : T.text, fontWeight: k === "pts" ? 700 : 400 }}>{g[k] ?? 0}</td>)}
                  <td style={td}>{fmtShot(g.fgm, g.fga)}</td>
                  <td style={td}>{fmtShot(g.tpm, g.tpa)}</td>
                  <td style={td}>{fmtShot(g.ftm, g.fta)}</td>
                </tr>
              );
            })}
          </tbody>
          {games.length > 1 && (
            <tfoot>
              <tr style={{ borderTop: `2px solid ${T.border}` }}>
                <td style={{ ...td, textAlign: "left", color: T.textMute, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 10 }}>Avg</td>
                <td style={td} /><td style={td} />
                {COLS.map(([k]) => <td key={k} style={{ ...td, color: k === "pts" ? T.accent : T.textDim, fontWeight: 700 }}>{avg(k)}</td>)}
                <td style={td} /><td style={td} /><td style={td} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function RankStat({ label, value }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ ...mono, fontSize: 9, letterSpacing: "0.16em", color: T.textMute, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 24, color: T.accent, fontWeight: 800, marginTop: 4 }}>{value ? `#${value}` : "—"}</div>
    </div>
  );
}

// Industry recruiting rankings, shown per service (247 / ESPN / Rivals).
// Only the services with verified data render numbers; the rest show "Not
// listed" so it's clear we cover all three without inventing ranks.
const RECRUIT_SERVICES = [
  { key: "247", label: "247Sports" },
  { key: "espn", label: "ESPN" },
];

function RecruitingBlock({ p }) {
  const rec = p.recruiting;
  if (!rec || !rec.services) return null;
  const stateLabel = STATE_LABELS[p.state] || p.state || "State";
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: "16px 20px" }}>
      <div style={{ ...mono, fontSize: 9, letterSpacing: "0.16em", color: T.textMute, textTransform: "uppercase", marginBottom: 14 }}>
        Industry Recruiting Rankings{rec.asOf ? ` · as of ${rec.asOf}` : ""}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {RECRUIT_SERVICES.map(({ key, label }) => {
          const s = rec.services[key];
          return (
            <div key={key} style={{ border: `1px solid ${T.borderSoft}`, padding: "12px 14px", background: s ? "var(--prospera-accent-bg-faint)" : "transparent", opacity: s ? 1 : 0.55 }}>
              <div style={{ ...mono, fontSize: 10, letterSpacing: "0.12em", color: T.text, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
              {s ? (
                <>
                  {s.stars ? <div style={{ marginTop: 8 }}><Stars count={s.stars} /></div> : null}
                  <div style={{ display: "grid", gap: 3, marginTop: 10 }}>
                    {s.national ? <RankLine label="National" value={`#${s.national}`} /> : null}
                    {s.stateRank ? <RankLine label={stateLabel} value={`#${s.stateRank}`} /> : null}
                    {s.positionRank ? <RankLine label={`${p.position || "Pos"}`} value={`#${s.positionRank}`} /> : null}
                    {s.rating != null ? <RankLine label="Rating" value={(s.rating / 100).toFixed(2)} /> : null}
                  </div>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noopener noreferrer"
                      style={{ ...mono, fontSize: 9, letterSpacing: "0.1em", color: T.signal, textTransform: "uppercase", textDecoration: "none", display: "inline-block", marginTop: 10 }}>
                      View on {label} ↗
                    </a>
                  ) : null}
                </>
              ) : (
                <div style={{ ...mono, fontSize: 10, color: T.textMute, marginTop: 10, letterSpacing: "0.04em" }}>Not listed</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RankLine({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
      <span style={{ ...mono, fontSize: 10, color: T.textMute, letterSpacing: "0.06em" }}>{label}</span>
      <span style={{ ...mono, fontSize: 12, color: T.accent, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

function Chip({ children }) {
  return (
    <span style={{
      ...mono, fontSize: 10, letterSpacing: "0.08em", color: T.text,
      background: T.surface2, border: `1px solid ${T.border}`, padding: "5px 10px", textTransform: "uppercase",
    }}>
      {children}
    </span>
  );
}

// Pick the primary stat context for the at-a-glance strip: prefer HS Season,
// otherwise the first available line (authored or Capitol Hoops summer).
function primaryStatLine(p) {
  const all = [...(Array.isArray(p.statLines) ? p.statLines : []), ...hsSeasonLineFor(p.name), ...capitolHoopsLinesFor(p.name)];
  if (all.length === 0) return null;
  return all.find((l) => /hs/i.test(l.context || "")) || all[0];
}

function HeadlineStats({ p }) {
  const line = primaryStatLine(p);
  if (!line || !line.stats) return null;
  const s = line.stats;
  const items = [
    { label: "PTS", value: perGame(s.ppg), accent: true },
    { label: "REB", value: perGame(s.rpg), accent: true },
    { label: "AST", value: perGame(s.apg), accent: true },
    { label: "GP",  value: fmtCount(s.gp != null ? s.gp : line.gp), accent: false },
  ];
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: "16px 20px" }}>
      <div style={{ ...mono, fontSize: 9, letterSpacing: "0.16em", color: T.textMute, textTransform: "uppercase", marginBottom: 12 }}>
        {line.context}{line.season ? ` · ${line.season}` : ""}{line.league ? ` · ${line.league}` : ""}
      </div>
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
        {items.map((it) => (
          <div key={it.label}>
            <div style={{ fontSize: 34, color: it.accent ? T.accent : T.textDim, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
              {it.value}
            </div>
            <div style={{ ...mono, fontSize: 9, letterSpacing: "0.16em", color: T.textMute, textTransform: "uppercase", marginTop: 6 }}>{it.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewTab({ p }) {
  // Authored stat lines + any Capitol Hoops summer lines matched by name.
  const authoredLines = Array.isArray(p.statLines) ? p.statLines : [];
  const statLines = [...authoredLines, ...hsSeasonLineFor(p.name), ...capitolHoopsLinesFor(p.name)];
  const isThin = !p.summary && !p.comp && (!Array.isArray(p.traits) || p.traits.length === 0);
  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* Thin auto-promoted profile — no authored scouting yet */}
      {isThin && (
        <div style={{ background: "var(--prospera-accent-bg-faint)", border: `1px dashed var(--prospera-accent-border-faint)`, padding: 16 }}>
          <div style={{ ...mono, fontSize: 9, letterSpacing: "0.18em", color: T.accent, textTransform: "uppercase", fontWeight: 700 }}>
            Profile in progress
          </div>
          <div style={{ fontSize: 13, color: T.textDim, lineHeight: 1.55, marginTop: 8 }}>
            {p.name} is tracked in the DMV database. Scouting report, measurables, rankings,
            and recruitment are pending — the stats below are real where available.
          </div>
        </div>
      )}

      {/* Summary */}
      {p.summary && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: 18 }}>
          <SectionLabel>Scout Summary</SectionLabel>
          <p style={{ fontSize: 14, color: T.text, lineHeight: 1.6, margin: "10px 0 0" }}>{p.summary}</p>
        </div>
      )}

      {/* Pro stylistic comp — single authored "plays like" read */}
      {p.comp && p.comp.player && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: 18, display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 auto" }}>
            <SectionLabel>Pro Comp</SectionLabel>
            <div style={{ fontSize: 26, color: T.accent, fontWeight: 800, marginTop: 8, letterSpacing: "-0.01em" }}>
              {p.comp.player}
            </div>
          </div>
          {p.comp.note && (
            <p style={{ flex: "1 1 280px", fontSize: 13, color: T.textDim, lineHeight: 1.6, margin: 0, borderLeft: `2px solid ${T.borderSoft}`, paddingLeft: 16 }}>
              {p.comp.note}
            </p>
          )}
        </div>
      )}

      {/* Traits */}
      {Array.isArray(p.traits) && p.traits.length > 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: 18 }}>
          <SectionLabel>Trait Grades</SectionLabel>
          <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
            {p.traits.map((t) => (
              <div key={t.name} style={{ display: "grid", gridTemplateColumns: "150px 1fr 36px", gap: 12, alignItems: "center" }}>
                <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{t.name}</div>
                <div style={{ position: "relative", height: 8, background: T.track }}>
                  <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${(t.grade / 10) * 100}%`, background: gradeColor(t.grade) }} />
                </div>
                <div style={{ ...mono, fontSize: 13, color: gradeColor(t.grade), fontWeight: 700, textAlign: "right" }}>{t.grade}</div>
                {t.note && <div style={{ gridColumn: "1 / -1", fontSize: 12, color: T.textDim, lineHeight: 1.5, marginTop: -4 }}>{t.note}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats — one section per context (HS Season / Summer (AAU) / Fall League) */}
      {statLines.length > 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: 18 }}>
          <SectionLabel>Stats by Context</SectionLabel>
          <div style={{ display: "grid", gap: 18, marginTop: 14 }}>
            {statLines.map((line, i) => (
              <StatLineBlock key={`${line.context}-${line.season}-${i}`} line={line} />
            ))}
          </div>
        </div>
      )}

      {/* Offers */}
      {Array.isArray(p.offers) && p.offers.length > 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: 18 }}>
          <SectionLabel>Offers</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {p.offers.map((o) => {
              const committed = p.commitment && o === p.commitment;
              return (
                <span
                  key={o}
                  style={{
                    ...mono, fontSize: 11, letterSpacing: "0.06em",
                    color: committed ? T.bg : T.textDim,
                    background: committed ? T.positive : "transparent",
                    border: `1px solid ${committed ? T.positive : T.border}`,
                    padding: "5px 10px",
                  }}
                >
                  {o}{committed ? " ✓" : ""}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }) {
  // Sans (not mono) + larger for readability; still an uppercase signal-cyan eyebrow.
  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, letterSpacing: "0.1em", color: T.signal, textTransform: "uppercase", fontWeight: 800 }}>
      {children}
    </div>
  );
}

function StatCell({ label, value, tone = "default" }) {
  const accent = tone === "accent";
  const lead = tone === "lead";
  return (
    <div style={{
      textAlign: "center",
      background: lead ? "var(--prospera-accent-bg)" : T.surface2,
      border: `1px solid ${lead ? "var(--prospera-accent-border)" : T.borderSoft}`,
      padding: "11px 6px",
    }}>
      <div style={{ ...mono, fontSize: 8.5, letterSpacing: "0.14em", color: lead ? T.accent : T.textMute, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 19, color: accent || lead ? T.accent : T.text, fontWeight: 700, marginTop: 5, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}

// One stat context (HS Season / Summer / Capitol Hoops / Fall). Split into two
// labeled bands — Per Game and Shooting — so a profile reads in clean groups
// instead of one undifferentiated row of nine numbers. GP leads (highlighted).
function StatLineBlock({ line }) {
  const s = line.stats || {};
  const gp = s.gp != null ? s.gp : line.gp;
  const smallSample = gp != null && gp <= 3;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ ...mono, fontSize: 11, letterSpacing: "0.1em", color: T.accent, textTransform: "uppercase", fontWeight: 700 }}>
          {line.context}
        </span>
        <span style={{ ...mono, fontSize: 10, letterSpacing: "0.06em", color: T.textMute }}>
          {[line.season, line.team, line.league].filter(Boolean).join(" · ")}
        </span>
        {smallSample && (
          <span style={{ ...mono, fontSize: 9, letterSpacing: "0.1em", color: T.warn, textTransform: "uppercase" }}>· small sample</span>
        )}
      </div>

      <StatGroup label="Per Game" cols={[
        { label: "GP", value: fmtCount(gp), tone: "lead" },
        { label: "PTS", value: perGame(s.ppg), tone: "accent" },
        { label: "REB", value: perGame(s.rpg) },
        { label: "AST", value: perGame(s.apg) },
        { label: "STL", value: perGame(s.spg) },
        { label: "BLK", value: perGame(s.bpg) },
      ]} />

      <StatGroup label="Shooting" cols={[
        { label: "FG%", value: pct(s.fgPct) },
        { label: "3P%", value: pct(s.threePct) },
        { label: "FT%", value: pct(s.ftPct) },
      ]} />
    </div>
  );
}

function StatGroup({ label, cols }) {
  return (
    <div>
      <div style={{ ...mono, fontSize: 8.5, letterSpacing: "0.18em", color: T.textMute, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))`, gap: 8 }}>
        {cols.map((c) => <StatCell key={c.label} label={c.label} value={c.value} tone={c.tone} />)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUMMER LEAGUE — Capitol Hoops team browser (team list → roster + stats)
// ---------------------------------------------------------------------------
const SUMMER_STAT_COLS = [
  { key: "ppg", label: "PPG" },
  { key: "rpg", label: "RPG" },
  { key: "apg", label: "APG" },
  { key: "spg", label: "SPG" },
  { key: "bpg", label: "BPG" },
  { key: "fgPct", label: "FG%" },
  { key: "threePct", label: "3P%" },
  { key: "ftPct", label: "FT%" },
];

function SummerLeague({ onOpenProfile }) {
  const [teamSlug, setTeamSlug] = useState(null);
  const [mode, setMode] = useState("teams"); // "teams" | "leaders" | "schedule"
  const team = teamSlug ? CH_TEAMS[teamSlug] : null;

  if (team) {
    return <SummerTeam team={team} onBack={() => setTeamSlug(null)} onOpenProfile={onOpenProfile} />;
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <SectionLabel>Capitol Hoops Summer League · 2026</SectionLabel>
          <p style={{ fontSize: 13, color: T.textDim, lineHeight: 1.5, margin: "8px 0 0", maxWidth: 640 }}>
            Live summer-league rosters, box-score averages, and statistical leaders across the DMV.
            Small samples — games played leads every line.
          </p>
        </div>
        <Segmented value={mode} onChange={setMode} options={[["teams", "Teams"], ["schedule", "Schedule"], ["leaders", "Leaders"]]} />
      </div>

      {mode === "teams" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {Object.keys(CH_TEAMS).map((slug) => {
            const t = CH_TEAMS[slug];
            return (
              <button
                key={slug}
                type="button"
                onClick={() => setTeamSlug(slug)}
                style={{ textAlign: "left", background: T.surface, border: `1px solid ${T.border}`, padding: 16, cursor: "pointer", color: T.text }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--prospera-accent-border)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--prospera-border)")}
              >
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{t.name}</div>
                <div style={{ ...mono, fontSize: 10, color: T.textMute, letterSpacing: "0.08em", marginTop: 6 }}>
                  {t.players.length} players · {t.headCoach}
                </div>
              </button>
            );
          })}
        </div>
      ) : mode === "schedule" ? (
        <FullSchedule onOpenTeam={(slug) => setTeamSlug(slug)} />
      ) : (
        <SummerLeaders onOpenProfile={onOpenProfile} />
      )}
    </div>
  );
}

// Statistical leaders across all Capitol Hoops players. One leaderboard card
// per stat. GP shown on every line; percentage boards require 2+ games so a
// single make doesn't top the board.
const LEADER_CATS = [
  { key: "ppg",      label: "Points",   minGp: 1, unit: "" },
  { key: "rpg",      label: "Rebounds", minGp: 1, unit: "" },
  { key: "apg",      label: "Assists",  minGp: 1, unit: "" },
  { key: "spg",      label: "Steals",   minGp: 1, unit: "" },
  { key: "bpg",      label: "Blocks",   minGp: 1, unit: "" },
  { key: "fgPct",    label: "FG%",      minGp: 2, unit: "%" },
  { key: "threePct", label: "3P%",      minGp: 2, unit: "%" },
  { key: "ftPct",    label: "FT%",      minGp: 2, unit: "%" },
];

function SummerLeaders({ onOpenProfile }) {
  const allPlayers = useMemo(() => {
    const out = [];
    for (const t of Object.values(CH_TEAMS)) {
      for (const pl of t.players || []) out.push({ ...pl, teamName: t.name });
    }
    return out;
  }, []);

  return (
    <div>
      <div style={{ ...mono, fontSize: 9, color: T.textMute, letterSpacing: "0.06em", marginBottom: 14 }}>
        Across all {allPlayers.length} DMV players · 2026 · GP shown on every line · % boards require 2+ games
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {LEADER_CATS.map((cat) => (
          <LeaderboardCard key={cat.key} cat={cat} players={allPlayers} onOpenProfile={onOpenProfile} />
        ))}
      </div>
    </div>
  );
}

function LeaderboardCard({ cat, players, onOpenProfile }) {
  const top = useMemo(() => {
    return players
      .filter((p) => (p.stats?.gp ?? 0) >= cat.minGp && (p.stats?.[cat.key] ?? 0) > 0)
      .sort((a, b) => (b.stats[cat.key] ?? 0) - (a.stats[cat.key] ?? 0))
      .slice(0, 5);
  }, [cat, players]);

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: 16 }}>
      <div style={{ ...mono, fontSize: 10, letterSpacing: "0.16em", color: T.accent, textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>
        {cat.label} Leaders
      </div>
      {top.length === 0 ? (
        <div style={{ ...mono, fontSize: 11, color: T.textMute }}>No qualifiers</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {top.map((p, i) => {
            const tracked = PROSPECT_BY_NAMEKEY[nameKey(p.name)];
            return (
              <div key={p.name + p.teamName} style={{ display: "grid", gridTemplateColumns: "16px 1fr auto", gap: 10, alignItems: "center" }}>
                <span style={{ ...mono, fontSize: 11, color: i === 0 ? T.accent : T.textMute, fontWeight: i === 0 ? 700 : 400 }}>{i + 1}</span>
                <div style={{ minWidth: 0 }}>
                  {tracked ? (
                    <button type="button" onClick={() => onOpenProfile(tracked.id)} style={{ ...mono, fontSize: 12, color: T.accent, background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left", fontWeight: 600 }}>
                      {p.name}
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>{p.name}</span>
                  )}
                  <div style={{ ...mono, fontSize: 9, color: T.textMute, letterSpacing: "0.06em", marginTop: 1 }}>
                    {p.teamName} · {p.stats.gp} GP
                  </div>
                </div>
                <span style={{ ...mono, fontSize: 16, color: T.accent, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                  {cat.unit === "%" ? pct(p.stats[cat.key]) : perGame(p.stats[cat.key])}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Capitol Hoops summer-league roster + stats table. Extracted so it can render
// both in the Summer League browser and inside a school's Stats tab (where the
// season vs. summer split matters — small summer samples shouldn't be confused
// with full HS-season numbers).
function SummerStatsTable({ team, onOpenProfile }) {
  const [sortKey, setSortKey] = useState("ppg");
  const sorted = useMemo(() => {
    return [...team.players].sort((a, b) => (b.stats?.[sortKey] ?? -1) - (a.stats?.[sortKey] ?? -1));
  }, [team, sortKey]);

  return (
    <>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", ...mono, fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              <th style={thStyle("left")}>#</th>
              <th style={thStyle("left")}>Player</th>
              <th style={thStyle("left")}>Pos</th>
              <th style={thStyle("left")}>Class</th>
              <th style={{ ...thStyle("right"), color: T.accent, borderLeft: `1px solid ${T.border}` }}>GP</th>
              {SUMMER_STAT_COLS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => setSortKey(c.key)}
                  style={{ ...thStyle("right"), cursor: "pointer", color: sortKey === c.key ? T.accent : T.textDim, borderLeft: c.key === "fgPct" ? `1px solid ${T.border}` : undefined }}
                >
                  {c.label}{sortKey === c.key ? " ↓" : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((pl, ri) => {
              const tracked = PROSPECT_BY_NAMEKEY[nameKey(pl.name)];
              const zebra = ri % 2 === 1 ? "var(--prospera-surface-2)" : "transparent";
              return (
                <tr key={pl.number + pl.name} style={{ borderBottom: `1px solid ${T.borderSoft}`, background: zebra }}>
                  <td style={tdStyle("left", T.textMute)}>{pl.number}</td>
                  <td style={tdStyle("left", T.text)}>
                    {tracked ? (
                      <button
                        type="button"
                        onClick={() => onOpenProfile(tracked.id)}
                        style={{ ...mono, fontSize: 12, color: T.accent, background: "transparent", border: "none", padding: 0, cursor: "pointer", fontWeight: 600 }}
                      >
                        {pl.name} ↗
                      </button>
                    ) : pl.name}
                  </td>
                  <td style={tdStyle("left", T.textDim)}>{pl.position}</td>
                  <td style={tdStyle("left", T.textDim)}>{classTag(pl.classYear) || "—"}</td>
                  <td style={{ ...tdStyle("right", T.text), fontWeight: 700, fontVariantNumeric: "tabular-nums", borderLeft: `1px solid ${T.border}` }}>{pl.stats?.gp ?? "—"}</td>
                  {SUMMER_STAT_COLS.map((c) => (
                    <td key={c.key} style={{
                      ...tdStyle("right", c.key === "ppg" ? T.accent : (sortKey === c.key ? T.text : T.textDim)),
                      fontWeight: c.key === "ppg" || sortKey === c.key ? 700 : 400,
                      fontVariantNumeric: "tabular-nums",
                      borderLeft: c.key === "fgPct" ? `1px solid ${T.border}` : undefined,
                    }}>
                      {fmtStat(c.key, pl.stats?.[c.key])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ ...mono, fontSize: 9, color: T.textMute, letterSpacing: "0.06em" }}>
        Source: Capitol Hoops Summer League. Small samples — read GP first. Orange names link to tracked prospect profiles.
      </div>
    </>
  );
}

function SummerTeam({ team, onBack, onOpenProfile }) {
  const [tab, setTab] = useState("roster"); // "roster" | "games"
  const hasGames = useMemo(() => gamesForTeam(team.name).length > 0, [team]);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <button
        type="button"
        onClick={onBack}
        style={{ ...mono, fontSize: 11, letterSpacing: "0.14em", color: T.signal, background: "transparent", border: "none", textTransform: "uppercase", justifySelf: "start", padding: 0 }}
      >
        ← All summer teams
      </button>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: 18 }}>
        <h2 style={{ ...serif, fontSize: 28, margin: 0, color: T.text, fontWeight: 600, letterSpacing: "-0.01em" }}>{team.name}</h2>
        <div style={{ ...mono, fontSize: 10, color: T.textMute, letterSpacing: "0.08em", marginTop: 6 }}>
          Capitol Hoops {team.season} · {team.headCoach} · {team.players.length} players
        </div>
      </div>

      {hasGames && (
        <Segmented value={tab} onChange={setTab} options={[["roster", "Roster & Stats"], ["games", "Upcoming Games"]]} />
      )}

      {tab === "games" && hasGames ? (
        <TeamSchedule teamName={team.name} />
      ) : (
        <SummerStatsTable team={team} onOpenProfile={onOpenProfile} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SCHEDULE — the full Capitol Hoops slate (Summer League → Schedule tab) plus
// a per-team slate (Upcoming Games tab on team/school pages). Home team always
// renders first; finals show the score with the winner bolded, upcoming games
// show the tip time.
// ---------------------------------------------------------------------------
function ResultPill({ status }) {
  const final = status === "final";
  return (
    <span style={{
      ...mono, fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase",
      color: final ? T.textMute : T.signal,
      border: `1px solid ${final ? T.borderSoft : "var(--prospera-accent-border)"}`,
      padding: "2px 6px", borderRadius: 2, whiteSpace: "nowrap",
    }}>
      {final ? "Final" : "Upcoming"}
    </span>
  );
}

function ScoreOrTime({ g, perspective }) {
  // perspective: optional team name to render a W/L from that team's view.
  if (g.status !== "final") {
    return <span style={{ ...mono, fontSize: 12, color: T.signal, fontWeight: 700, whiteSpace: "nowrap" }}>{g.time || "TBD"}</span>;
  }
  const homeWin = g.homeScore > g.awayScore;
  let wl = null;
  if (perspective) {
    const isHome = teamNameKey(g.home) === teamNameKey(perspective);
    const won = isHome ? homeWin : !homeWin;
    wl = <span style={{ ...mono, fontSize: 10, fontWeight: 800, color: won ? T.positive : T.danger, marginRight: 6 }}>{won ? "W" : "L"}</span>;
  }
  return (
    <span style={{ ...mono, fontSize: 12, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
      {wl}
      <span style={{ color: homeWin ? T.text : T.textDim, fontWeight: homeWin ? 800 : 500 }}>{g.homeScore}</span>
      <span style={{ color: T.textMute }}>–</span>
      <span style={{ color: !homeWin ? T.text : T.textDim, fontWeight: !homeWin ? 800 : 500 }}>{g.awayScore}</span>
    </span>
  );
}

function TeamName({ name, onOpenTeam, strong }) {
  const slug = onOpenTeam ? chSlugForTeamName(name) : null;
  const base = { fontSize: 13, color: strong ? T.text : T.textDim, fontWeight: strong ? 700 : 500 };
  if (slug) {
    return (
      <button type="button" onClick={() => onOpenTeam(slug)}
        style={{ ...base, background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--prospera-cyan)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = strong ? "var(--prospera-text)" : "var(--prospera-text-dim)")}
      >
        {name}
      </button>
    );
  }
  return <span style={base}>{name}</span>;
}

// Full league schedule, grouped by date, with search + status filter.
function FullSchedule({ onOpenTeam }) {
  const [filter, setFilter] = useState("all"); // all | upcoming | results
  const [q, setQ] = useState("");

  const groups = useMemo(() => {
    const k = q.trim().toLowerCase();
    const filtered = SCHEDULE.filter((g) => {
      if (filter === "upcoming" && g.status !== "scheduled") return false;
      if (filter === "results" && g.status !== "final") return false;
      if (k && !(`${g.home} ${g.away} ${g.court}`.toLowerCase().includes(k))) return false;
      return true;
    });
    const byDate = new Map();
    for (const g of filtered) {
      if (!byDate.has(g.date)) byDate.set(g.date, []);
      byDate.get(g.date).push(g);
    }
    return [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filter, q]);

  const total = useMemo(() => groups.reduce((n, [, gs]) => n + gs.length, 0), [groups]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Segmented value={filter} onChange={setFilter} options={[["all", "All"], ["upcoming", "Upcoming"], ["results", "Results"]]} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by team or court…"
          style={{ ...mono, fontSize: 12, color: T.text, background: T.surface, border: `1px solid ${T.border}`, padding: "9px 12px", minWidth: 220, flex: "0 1 320px" }}
        />
      </div>

      <div style={{ ...mono, fontSize: 9, color: T.textMute, letterSpacing: "0.06em" }}>
        {total} {total === 1 ? "game" : "games"} · home team listed first · click a team for its roster
      </div>

      {groups.length === 0 ? (
        <div style={{ background: T.surface, border: `1px dashed ${T.border}`, padding: "32px 24px", textAlign: "center" }}>
          <div style={{ ...mono, fontSize: 10, letterSpacing: "0.2em", color: T.textMute, textTransform: "uppercase" }}>No games match</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          {groups.map(([date, gs]) => {
            const isToday = date === TODAY_ISO;
            return (
              <div key={date} style={{ display: "grid", gap: 6 }}>
                <div style={{ ...mono, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: isToday ? T.accent : T.textDim, display: "flex", alignItems: "center", gap: 8, padding: "2px 0", borderBottom: `1px solid ${T.borderSoft}` }}>
                  {scheduleDayLabel(date)}{isToday ? " · Today" : ""}
                </div>
                {gs.map((g, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center", background: T.surface, border: `1px solid ${T.border}`, padding: "10px 14px" }}>
                    <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <TeamName name={g.home} onOpenTeam={onOpenTeam} strong />
                        <span style={{ ...mono, fontSize: 10, color: T.textMute }}>vs</span>
                        <TeamName name={g.away} onOpenTeam={onOpenTeam} strong />
                      </div>
                      <div style={{ ...mono, fontSize: 9, color: T.textMute, letterSpacing: "0.06em" }}>{g.court}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, justifySelf: "end" }}>
                      <ScoreOrTime g={g} />
                      <ResultPill status={g.status} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// One team's slate — upcoming games first, then past results (with W/L).
function TeamSchedule({ teamName }) {
  const games = useMemo(() => gamesForTeam(teamName), [teamName]);
  const upcoming = games.filter((g) => g.status !== "final");
  const results = games.filter((g) => g.status === "final");

  if (games.length === 0) {
    return (
      <div style={{ background: T.surface, border: `1px dashed ${T.border}`, padding: "32px 24px", textAlign: "center" }}>
        <div style={{ ...mono, fontSize: 10, letterSpacing: "0.2em", color: T.textMute, textTransform: "uppercase" }}>No scheduled games</div>
      </div>
    );
  }

  const Row = ({ g }) => {
    const isHome = teamNameKey(g.home) === teamNameKey(teamName);
    const opp = isHome ? g.away : g.home;
    return (
      <div style={{ display: "grid", gridTemplateColumns: "76px minmax(0,1fr) auto", gap: 12, alignItems: "center", background: T.surface, border: `1px solid ${T.border}`, padding: "10px 14px" }}>
        <div style={{ ...mono, fontSize: 10, color: T.textDim, letterSpacing: "0.04em" }}>{scheduleDayLabel(g.date)}</div>
        <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>
            <span style={{ ...mono, fontSize: 10, color: T.textMute, marginRight: 6 }}>{isHome ? "vs" : "@"}</span>
            {opp}
          </div>
          <div style={{ ...mono, fontSize: 9, color: T.textMute, letterSpacing: "0.06em" }}>{g.court}</div>
        </div>
        <div style={{ justifySelf: "end" }}>
          <ScoreOrTime g={g} perspective={teamName} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <div style={{ ...mono, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: T.accent, marginBottom: 8 }}>
          Upcoming{upcoming.length ? ` · ${upcoming.length}` : ""}
        </div>
        {upcoming.length === 0 ? (
          <div style={{ ...mono, fontSize: 11, color: T.textMute, padding: "4px 0" }}>No upcoming games — season complete.</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>{upcoming.map((g, i) => <Row key={i} g={g} />)}</div>
        )}
      </div>
      {results.length > 0 && (
        <div>
          <div style={{ ...mono, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: T.textDim, marginBottom: 8 }}>
            Results · {results.length}
          </div>
          <div style={{ display: "grid", gap: 6 }}>{results.map((g, i) => <Row key={i} g={g} />)}</div>
        </div>
      )}
      <div style={{ ...mono, fontSize: 9, color: T.textMute, letterSpacing: "0.06em" }}>
        Capitol Hoops Summer League · "vs" = home, "@" = away · W/L from {teamName}'s perspective.
      </div>
    </div>
  );
}

function thStyle(align) {
  return { ...mono, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--prospera-text-mute)", textAlign: align, padding: "10px 12px", whiteSpace: "nowrap" };
}
function tdStyle(align, color) {
  return { padding: "9px 12px", textAlign: align, color, whiteSpace: "nowrap" };
}

// ---------------------------------------------------------------------------
// TEAM STATS — season-stats panel for a school's varsity team. Data lives in
// src/data/teamStats.json, keyed by canonical school name; only teams present
// there get a Stats tab (Hayfield is the reference build). Each view mirrors a
// tab from the source stat sheet. `lead` flags the headline column.
// ---------------------------------------------------------------------------
const TEAM_STAT_VIEWS = [
  { key: "gameStats", label: "Game Stats", cols: [
    { key: "ppg", label: "PPG", fmt: "dec", lead: true },
    { key: "rpg", label: "RPG", fmt: "dec" },
    { key: "oreb", label: "OREB", fmt: "dec" },
    { key: "dreb", label: "DREB", fmt: "dec" },
    { key: "apg", label: "APG", fmt: "dec" },
    { key: "spg", label: "SPG", fmt: "dec" },
    { key: "bpg", label: "BPG", fmt: "dec" },
    { key: "tpg", label: "TPG", fmt: "dec" },
    { key: "pf", label: "PF", fmt: "dec" },
  ] },
  { key: "shooting", label: "Shooting", cols: [
    { key: "pts", label: "PTS", fmt: "int", lead: true },
    { key: "fgm", label: "FGM", fmt: "int" },
    { key: "fga", label: "FGA", fmt: "int" },
    { key: "fgPct", label: "FG%", fmt: "pct" },
    { key: "tpm", label: "3PM", fmt: "int" },
    { key: "tpa", label: "3PA", fmt: "int" },
    { key: "tpPct", label: "3P%", fmt: "pct" },
    { key: "ftm", label: "FTM", fmt: "int" },
    { key: "fta", label: "FTA", fmt: "int" },
    { key: "ftPct", label: "FT%", fmt: "pct" },
    { key: "twoPm", label: "2FGM", fmt: "int" },
    { key: "twoPa", label: "2FGA", fmt: "int" },
    { key: "twoPct", label: "2FG%", fmt: "pct" },
    { key: "pps", label: "PPS", fmt: "dec" },
    { key: "afgPct", label: "AFG%", fmt: "pct" },
  ] },
  // Columns for these arrive with the source paste; until then they render an
  // "awaiting data" state (players carry null for the view).
  { key: "totals", label: "Totals", cols: [] },
  { key: "misc", label: "Misc Totals", cols: [] },
  { key: "per32", label: "Per 32", cols: [] },
];

function fmtTeamStat(fmt, v) {
  if (v == null || v === "") return "—";
  if (fmt === "pct") return `${v}%`;
  if (fmt === "int") return String(v);
  return Number(v).toFixed(1);
}

function StaffItem({ role, name }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...mono, fontSize: 8.5, letterSpacing: "0.16em", color: T.textMute, textTransform: "uppercase" }}>{role}</div>
      <div style={{ fontSize: 13, color: T.text, fontWeight: 600, marginTop: 2 }}>{name}</div>
    </div>
  );
}

function TeamStatsPanel({ teamStats, summerTeam, onOpenProfile }) {
  const [source, setSource] = useState("season"); // "season" (HS) | "summer" (Capitol Hoops)
  const [view, setView] = useState("gameStats");
  const def = TEAM_STAT_VIEWS.find((v) => v.key === view);
  const players = teamStats.players || [];
  const [sortKey, setSortKey] = useState(def.cols.find((c) => c.lead)?.key || null);

  const colMeta = useMemo(() => def.cols.find((c) => c.key === sortKey) || def.cols.find((c) => c.lead) || def.cols[0] || null, [def, sortKey]);
  const activeSort = colMeta?.key || null;

  const rows = useMemo(() => {
    const withData = players.filter((pl) => pl[view] && Object.keys(pl[view]).length);
    if (!activeSort) return [...withData].sort((a, b) => a.number - b.number);
    return [...withData].sort((a, b) => (b[view]?.[activeSort] ?? -Infinity) - (a[view]?.[activeSort] ?? -Infinity));
  }, [players, view, activeSort]);

  const showSummer = source === "summer" && summerTeam;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {summerTeam && (
        <Segmented value={source} onChange={setSource} options={[["season", "HS Season"], ["summer", "Summer League"]]} />
      )}

      {showSummer ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ ...mono, fontSize: 9, color: T.textMute, letterSpacing: "0.06em" }}>
            Capitol Hoops Summer League {summerTeam.season} · {summerTeam.players.length} players
          </div>
          <SummerStatsTable team={summerTeam} onOpenProfile={onOpenProfile} />
        </div>
      ) : (
      <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Segmented value={view} onChange={(v) => { setView(v); const lead = TEAM_STAT_VIEWS.find((x) => x.key === v).cols.find((c) => c.lead)?.key || null; setSortKey(lead); }} options={TEAM_STAT_VIEWS.map((v) => [v.key, v.label])} />
        <div style={{ ...mono, fontSize: 9, color: T.textMute, letterSpacing: "0.06em" }}>
          {teamStats.season ? `Season ${teamStats.season}` : ""}{teamStats.updated ? ` · updated ${teamStats.updated}` : ""}
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ background: T.surface, border: `1px dashed ${T.border}`, padding: "32px 24px", textAlign: "center" }}>
          <div style={{ ...mono, fontSize: 10, letterSpacing: "0.2em", color: T.textMute, textTransform: "uppercase" }}>
            {def.label} — awaiting data
          </div>
        </div>
      ) : (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", ...mono, fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                <th style={thStyle("left")}>#</th>
                <th style={thStyle("left")}>Player</th>
                <th style={thStyle("left")}>Class</th>
                <th style={{ ...thStyle("right"), color: T.accent, borderLeft: `1px solid ${T.border}` }}>GP</th>
                {def.cols.map((c) => (
                  <th
                    key={c.key}
                    onClick={() => setSortKey(c.key)}
                    style={{ ...thStyle("right"), cursor: "pointer", color: activeSort === c.key ? T.accent : T.textDim }}
                  >
                    {c.label}{activeSort === c.key ? " ↓" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((pl, ri) => {
                const tracked = PROSPECT_BY_NAMEKEY[nameKey(pl.name)];
                const zebra = ri % 2 === 1 ? "var(--prospera-surface-2)" : "transparent";
                const cls = pl.classYear || (tracked ? classTag(tracked.gradYear) : null);
                return (
                  <tr key={pl.id || pl.number} style={{ borderBottom: `1px solid ${T.borderSoft}`, background: zebra }}>
                    <td style={tdStyle("left", T.textMute)}>{pl.number}</td>
                    <td style={tdStyle("left", T.text)}>
                      {tracked ? (
                        <button
                          type="button"
                          onClick={() => onOpenProfile(tracked.id)}
                          style={{ ...mono, fontSize: 12, color: T.accent, background: "transparent", border: "none", padding: 0, cursor: "pointer", fontWeight: 600 }}
                        >
                          {pl.name} ↗
                        </button>
                      ) : pl.name}
                    </td>
                    <td style={tdStyle("left", T.textDim)}>{cls || "—"}</td>
                    <td style={{ ...tdStyle("right", T.text), fontWeight: 700, fontVariantNumeric: "tabular-nums", borderLeft: `1px solid ${T.border}` }}>{pl.gp ?? "—"}</td>
                    {def.cols.map((c) => (
                      <td key={c.key} style={{
                        ...tdStyle("right", c.lead ? T.accent : (activeSort === c.key ? T.text : T.textDim)),
                        fontWeight: c.lead || activeSort === c.key ? 700 : 400,
                        fontVariantNumeric: "tabular-nums",
                      }}>
                        {fmtTeamStat(c.fmt, pl[view]?.[c.key])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ ...mono, fontSize: 9, color: T.textMute, letterSpacing: "0.06em" }}>
        Varsity HS-season stats. Tap a column to sort; orange names link to tracked prospect profiles.
      </div>
      </>
      )}
    </div>
  );
}


// ---------------------------------------------------------------------------
// BIG BOARD — placeholder until rankings are authored. The Board component
// above is fully built and stays in the codebase; flip APP render back to
// <Board onOpen={...}/> once the founder rankings exist.
// ---------------------------------------------------------------------------
function BoardComingSoon() {
  const count = PROSPECTS.length;
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{
        background: `linear-gradient(135deg, var(--prospera-accent-bg-mid) 0%, ${T.surface} 60%)`,
        border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.accent}`,
        padding: "48px 32px", textAlign: "center",
      }}>
        <div style={{ ...mono, fontSize: 10, letterSpacing: "0.28em", color: T.accent, textTransform: "uppercase", fontWeight: 700 }}>
          Big Board
        </div>
        <div style={{ fontSize: 34, color: T.text, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 12 }}>
          Coming Soon
        </div>
        <p style={{ fontSize: 14, color: T.textDim, lineHeight: 1.6, maxWidth: 460, margin: "14px auto 0" }}>
          Our DMV rankings are being hand-authored — tiers, evaluations, and a
          full ordered board. We're not publishing a board until the scouting
          work behind it is real.
        </p>
        <div style={{ ...mono, fontSize: 11, letterSpacing: "0.12em", color: T.textMute, textTransform: "uppercase", marginTop: 22 }}>
          {count} DMV prospects already in the database
        </div>
        <p style={{ ...mono, fontSize: 11, color: T.signal, letterSpacing: "0.06em", marginTop: 8 }}>
          Browse them now via Summer League →
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// COMMITMENTS TRACKER — prospects who've committed / signed
// ---------------------------------------------------------------------------
function CommitmentsTracker({ onOpen }) {
  const committed = useMemo(
    () => PROSPECTS
      .filter((p) => p.status === "committed" || p.status === "signed")
      .sort((a, b) => (a.rankings?.national ?? 999) - (b.rankings?.national ?? 999)),
    []
  );

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <SectionLabel>Commitments · 2026 Class</SectionLabel>
        <p style={{ fontSize: 13, color: T.textDim, lineHeight: 1.5, margin: "8px 0 0", maxWidth: 640 }}>
          DMV prospects who've made their college choice. Updates as commitments roll in.
        </p>
      </div>

      {committed.length === 0 ? (
        <div style={{ background: T.surface, border: `1px dashed ${T.border}`, padding: "40px 24px", textAlign: "center" }}>
          <div style={{ ...mono, fontSize: 10, letterSpacing: "0.2em", color: T.textMute, textTransform: "uppercase" }}>
            No commitments tracked yet
          </div>
          <div style={{ fontSize: 13, color: T.textDim, marginTop: 10, maxWidth: 380, margin: "10px auto 0", lineHeight: 1.5 }}>
            Once a prospect's status is set to committed or signed, they'll appear here with their college choice.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {committed.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpen(p.id)}
              style={{
                display: "grid", gridTemplateColumns: "56px 1fr auto", gap: 14, alignItems: "center", textAlign: "left",
                background: T.surface, border: `1px solid ${T.border}`, padding: "12px 16px", cursor: "pointer", color: T.text,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--prospera-accent-border)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--prospera-border)")}
            >
              <Avatar name={p.name} headshot={p.headshot} size={48} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{p.name}</div>
                <div style={{ ...mono, fontSize: 10, color: T.textMute, letterSpacing: "0.08em", marginTop: 3 }}>
                  {p.position} · {p.school} · {STATE_LABELS[p.state] || p.state}{classTag(p.gradYear) ? ` · ${classTag(p.gradYear)}` : ""}
                </div>
              </div>
              <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
                <span style={{ ...mono, fontSize: 13, color: T.positive, fontWeight: 700, letterSpacing: "0.04em" }}>
                  → {p.commitment}
                </span>
                <span style={{ ...mono, fontSize: 9, letterSpacing: "0.14em", color: T.textMute, textTransform: "uppercase" }}>
                  {p.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DMV MAP — schools plotted by real geocoded coordinates
// ---------------------------------------------------------------------------
// Build the schools array the map module consumes: one row per geocoded school
// with its top summer scorer (real PPG — no fabricated tiers/stars). Computed
// once from the module-level data, which is fixed after initData().
function buildMapSchools() {
  const out = [];
  for (const [name, loc] of Object.entries(SCHOOL_LOCATIONS)) {
    const s = SCHOOLS[name];
    if (!s || loc.lat == null || loc.lng == null) continue;
    const state = loc.state || s.state || null; // geocoded location is authoritative

    // Top prospect = highest summer PPG; fall back to first roster name.
    let top = null;
    let bestPpg = -1;
    for (const p of s.prospects) {
      const ppg = primaryStatLine(p)?.stats?.ppg ?? null;
      if (ppg != null && ppg > bestPpg) {
        bestPpg = ppg;
        top = { n: p.name, pos: posLabel(p), ppg };
      }
    }
    if (!top && s.prospects[0]) {
      const p = s.prospects[0];
      top = { n: p.name, pos: posLabel(p), ppg: null };
    }

    const city = loc.county ? `${loc.county}, ${state || loc.state || ""}`.replace(/,\s*$/, "") : STATE_LABELS[state] || "";
    // id stays the internal key (used to open the school page); name is the
    // official display label.
    out.push({ id: name, name: officialSchoolName(name), city, lat: loc.lat, lng: loc.lng, state, prospects: s.prospects.length, top });
  }
  // Overlay the scraped DMV directory: every geocoded program we don't roster
  // yet, so the map shows the whole DMV footprint (not just player schools).
  // directoryOnly markers carry 0 prospects and no internal id (clicking is a
  // safe no-op until the school is rostered).
  const mapped = new Set(out.map((m) => schoolKey(m.name)));
  for (const d of DMV_DIRECTORY) {
    if (d.lat == null || d.lng == null) continue;
    const k = schoolKey(d.name);
    if (mapped.has(k)) continue;
    mapped.add(k);
    out.push({ id: `dir:${d.slug || d.name}`, name: d.name, city: [d.city, d.state].filter(Boolean).join(", "), lat: d.lat, lng: d.lng, state: d.state, prospects: 0, top: null, directoryOnly: true });
  }
  return out;
}

function posLabel(p) {
  const yr = classTag(p.gradYear) ? ` · ${classTag(p.gradYear)}` : "";
  return `${p.position || ""}${yr}`.trim().replace(/^·\s*/, "");
}

function DmvMap({ onOpenSchool }) {
  const mapSchools = useMemo(() => buildMapSchools(), []);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <SectionLabel>DMV Talent Map</SectionLabel>
        <p style={{ fontSize: 13, color: T.textDim, lineHeight: 1.5, margin: "8px 0 0", maxWidth: 620 }}>
          Every school in the database, plotted by location and colored by state.
          Filter the sidebar, click a pin for its top summer scorer, or open a school for its full roster.
        </p>
      </div>

      <Suspense
        fallback={
          <div style={{ height: "min(78vh, 720px)", minHeight: 560, display: "flex", alignItems: "center", justifyContent: "center", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, ...mono, fontSize: 11, letterSpacing: "0.14em", color: T.textDim }}>
            LOADING MAP…
          </div>
        }
      >
        <ProspectMap schools={mapSchools} onSelectSchool={(s) => onOpenSchool(s.name)} />
      </Suspense>

      <div style={{ ...mono, fontSize: 9, color: T.textMute, letterSpacing: "0.06em" }}>
        {mapSchools.length} schools mapped · tiles &copy; CARTO / OpenStreetMap · scroll to zoom, drag to pan
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SEARCH — global name/school lookup, in the header
// ---------------------------------------------------------------------------
function SearchBox({ onOpen }) {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const matches = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (k.length < 2) return [];
    return PROSPECTS
      .filter((p) => p.name.toLowerCase().includes(k) || (p.school || "").toLowerCase().includes(k))
      .slice(0, 8);
  }, [q]);

  return (
    <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 340 }}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Search players or schools…"
        style={{ width: "100%", background: T.surface2, border: `1px solid ${T.border}`, color: T.text, padding: "8px 11px", fontSize: 13, outline: "none" }}
      />
      {focused && matches.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: T.surface, border: `1px solid ${T.accent}`, zIndex: 200, maxHeight: 360, overflowY: "auto", boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}>
          {matches.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => { onOpen(p.id); setQ(""); }}
              style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", borderBottom: `1px solid ${T.borderSoft}`, padding: "10px 12px", cursor: "pointer", color: T.text }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--prospera-accent-bg-soft)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
              <div style={{ ...mono, fontSize: 9, color: T.textMute, letterSpacing: "0.06em", marginTop: 2 }}>
                {p.position || "—"} · {p.school}{classTag(p.gradYear) ? ` · ${classTag(p.gradYear)}` : ""}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CLASSES — browse prospects by graduating class
// ---------------------------------------------------------------------------
function Classes({ onOpen }) {
  const [year, setYear] = useState(null);
  const byYear = useMemo(() => {
    const m = {};
    for (const p of PROSPECTS) {
      const y = normGradYear(p.gradYear);
      if (!y || !ACTIVE_CLASSES.includes(y)) continue; // only the four tracked classes
      (m[y] = m[y] || []).push(p);
    }
    return m;
  }, []);
  const years = ACTIVE_CLASSES.filter((y) => byYear[y]);

  if (year) {
    const roster = [...byYear[year]]
      .map((p) => ({ p, ppg: primaryStatLine(p)?.stats?.ppg ?? null }))
      .sort((a, b) => (b.ppg ?? -1) - (a.ppg ?? -1));
    return (
      <div style={{ display: "grid", gap: 18 }}>
        <button type="button" onClick={() => setYear(null)} style={{ ...mono, fontSize: 11, letterSpacing: "0.14em", color: T.signal, background: "transparent", border: "none", textTransform: "uppercase", justifySelf: "start", padding: 0 }}>
          ← All classes
        </button>
        <div>
          <SectionLabel>Class of {year}</SectionLabel>
          <p style={{ fontSize: 13, color: T.textDim, margin: "8px 0 0" }}>{roster.length} prospects · sorted by summer PPG</p>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {roster.map(({ p, ppg }) => (
            <button key={p.id} type="button" onClick={() => onOpen(p.id)}
              style={{ display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 14, alignItems: "center", textAlign: "left", background: T.surface, border: `1px solid ${T.border}`, padding: "10px 16px", cursor: "pointer", color: T.text }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--prospera-accent-border)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--prospera-border)")}>
              <Avatar name={p.name} headshot={p.headshot} size={36} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                <div style={{ ...mono, fontSize: 10, color: T.textMute, letterSpacing: "0.06em", marginTop: 2 }}>{p.position || "—"} · {p.school}</div>
              </div>
              <div style={{ ...mono, fontSize: 12, color: ppg != null ? T.accent : T.textMute, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {ppg != null ? `${perGame(ppg)} PPG` : "—"}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <SectionLabel>Recruiting Classes</SectionLabel>
        <p style={{ fontSize: 13, color: T.textDim, lineHeight: 1.5, margin: "8px 0 0", maxWidth: 640 }}>
          Browse the DMV database by graduating class.
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
        {years.map((y) => (
          <button key={y} type="button" onClick={() => setYear(y)}
            style={{ textAlign: "left", background: T.surface, border: `1px solid ${T.border}`, padding: 18, cursor: "pointer", color: T.text }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--prospera-accent-border)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--prospera-border)")}>
            <div style={{ ...serif, fontSize: 30, fontWeight: 600, color: T.accent }}>'{String(y).slice(2)}</div>
            <div style={{ ...mono, fontSize: 10, color: T.textMute, letterSpacing: "0.08em", marginTop: 6 }}>
              Class of {y} · {byYear[y].length}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NEWS TICKER — hand-authored items + auto commitments + summer standouts
// ---------------------------------------------------------------------------
function buildTickerItems() {
  const items = [];
  // Hand-authored items, newest first by date.
  const authored = [...(NEWS_DATA.items || [])].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  for (const n of authored) {
    items.push({ tag: "NEWS", prospectId: n.prospectId || null, url: n.url || null, text: n.headline });
  }
  // Auto: commitments (factual events).
  for (const p of PROSPECTS) {
    if ((p.status === "committed" || p.status === "signed") && p.commitment) {
      items.push({ tag: "COMMIT", prospectId: p.id, text: `${p.name} commits to ${p.commitment}` });
    }
  }
  // Auto: top summer performers (derived from Capitol Hoops, 2+ GP).
  const all = [];
  for (const [slug, t] of Object.entries(CH_TEAMS)) for (const pl of t.players || []) all.push({ ...pl, school: canonicalSchool(slug, t.name) });
  const top = all.filter((p) => (p.stats?.gp ?? 0) >= 2).sort((a, b) => b.stats.ppg - a.stats.ppg).slice(0, 8);
  for (const pl of top) {
    const tracked = PROSPECT_BY_NAMEKEY[nameKey(pl.name)];
    items.push({ tag: "SUMMER", prospectId: tracked?.id || null, text: `${pl.name} — ${perGame(pl.stats.ppg)} PPG, ${pl.school} (Capitol Hoops)` });
  }
  return items;
}

function NewsTicker({ onOpen }) {
  const items = useMemo(buildTickerItems, []);
  if (items.length === 0) return null;
  const loop = [...items, ...items]; // duplicate for seamless marquee
  const tagColor = { COMMIT: "var(--prospera-positive)", SUMMER: "var(--prospera-cyan)", NEWS: "var(--prospera-signal)" };
  return (
    <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, height: 32, display: "flex", alignItems: "center", overflow: "hidden", position: "relative" }}>
      <div style={{ flexShrink: 0, padding: "0 12px", background: T.accent, color: T.bg, height: "100%", display: "flex", alignItems: "center", ...mono, fontSize: 9, letterSpacing: "0.2em", fontWeight: 800 }}>
        LIVE WIRE
      </div>
      <div style={{ flex: 1, overflow: "hidden", maskImage: "linear-gradient(to right, transparent, #000 24px, #000 calc(100% - 24px), transparent)" }}>
        <div className="preps-ticker" style={{ display: "flex", gap: 28, whiteSpace: "nowrap", paddingLeft: 24 }}>
          {loop.map((it, i) => {
            const clickable = it.prospectId || it.url;
            const handle = () => {
              if (it.prospectId) onOpen(it.prospectId);
              else if (it.url) window.open(it.url, "_blank", "noopener,noreferrer");
            };
            return (
              <button key={i} type="button" onClick={clickable ? handle : undefined}
                style={{ ...mono, fontSize: 11, color: T.textDim, background: "transparent", border: "none", padding: 0, cursor: clickable ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                <span style={{ color: tagColor[it.tag] || T.signal, fontWeight: 700, fontSize: 9, letterSpacing: "0.1em", border: `1px solid ${tagColor[it.tag] || T.signal}`, padding: "1px 5px" }}>{it.tag}</span>
                <span>{it.text}{it.url && !it.prospectId ? " ↗" : ""}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// APP
// ---------------------------------------------------------------------------
const NAV = [
  // Big Board is parked for now — no rankings product yet.
  { key: "prospects", label: "Prospects" },
  { key: "summer", label: "Teams" },
  { key: "scouthq", label: "Scout HQ" },
  { key: "recaps", label: "Recaps" },
  { key: "map", label: "Map" },
  { key: "classes", label: "Classes" },
  { key: "commitments", label: "Commitments" },
];

function LoadingScreen({ error }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <img src="/brand/svg/prosperahoops-lockup-dark.svg" alt="Prospera Hoops" style={{ height: 44, width: "auto" }} />
      {error ? (
        <div style={{ ...mono, fontSize: 11, color: T.danger, letterSpacing: "0.06em", maxWidth: 360, textAlign: "center", lineHeight: 1.6 }}>
          Couldn't load the database.<br />{error}
        </div>
      ) : (
        <div style={{ ...mono, fontSize: 9, letterSpacing: "0.24em", color: T.textMute, textTransform: "uppercase" }}>
          Loading DMV database…
        </div>
      )}
    </div>
  );
}

// Viewport hook — true when the screen is phone-width. Used to tighten the
// shell (header padding + single-row scrollable nav) on small screens.
function useIsMobile(bp = 640) {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.innerWidth <= bp);
  useEffect(() => {
    const f = () => setM(window.innerWidth <= bp);
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, [bp]);
  return m;
}

// --- Real-data adapters for the A1 scouting workspace ------------------------
// Shape the live PROSPECTS / SCHOOLS / CH_TEAMS stores into the workspace's
// {name, conf, region/county/st, gp, coach, roster:[...]} contract. Every roster
// player carries its real prospect `id` so the workspace can open the profile.
// Dedup key for matching our short school names to MaxPreps' official names:
// strip punctuation + common qualifiers ("Archbishop Spalding" → "spalding",
// "Gonzaga College" → "gonzaga", "Bullis School" → "bullis", "Paul VI Catholic"
// → "paulvi").
function schoolKey(name) {
  return String(name || "").toLowerCase()
    .replace(/\b(archbishop|the|saint|st\.?|school|catholic|college|academy|preparatory|prep|high|hs|secondary|senior|county)\b/g, " ")
    .replace(/[^a-z0-9]/g, "");
}

function buildWorkspaceSchools() {
  const map = new Map(); // schoolKey → school entry (player-having wins)
  for (const [name, s] of Object.entries(SCHOOLS)) {
    const loc = SCHOOL_LOCATIONS[name] || {};
    const roster = (s.prospects || []).map((pr) => ({
      name: pr.name, pos: pr.position || null,
      class: pr.gradYear ? String(normGradYear(pr.gradYear)).slice(2) : null,
      tracked: false, id: pr.id, goldTier: !!pr.goldTier, commit: pr.commitment || null,
    }));
    map.set(schoolKey(name), {
      name: officialSchoolName(name), slug: schoolKey(name), conf: null,
      county: loc.county || null, st: loc.state || s.state || null,
      players: roster.length, coach: s.coach || null, roster,
    });
  }
  // Merge in the scraped DMV directory: every program that exists DMV-wide, so
  // schools we don't roster yet still appear (with "not yet tracked").
  for (const d of DMV_DIRECTORY) {
    const k = schoolKey(d.name);
    if (map.has(k)) {
      const e = map.get(k); // enrich existing with city if missing
      if (!e.county && d.city) e.county = d.city;
      continue;
    }
    map.set(k, {
      name: d.name, slug: k, conf: null, county: d.city || null, st: d.state || null,
      players: 0, coach: null, roster: [], directoryOnly: true,
    });
  }
  // Second pass: merge near-duplicates whose DISPLAY names normalize to the same
  // key (e.g. "Walter Johnson" vs "Walter Johnson High School", which entered the
  // map under different keys). Keep the entry with a roster / the more official
  // (longer) name, and carry over any missing location/coach info.
  const byDisplay = new Map();
  for (const e of map.values()) {
    const k = schoolKey(e.name) || e.slug;
    const prev = byDisplay.get(k);
    if (!prev) { byDisplay.set(k, e); continue; }
    const keep = (e.roster?.length || 0) > (prev.roster?.length || 0) ? e : prev;
    const drop = keep === e ? prev : e;
    keep.county = keep.county || drop.county;
    keep.st = keep.st || drop.st;
    keep.coach = keep.coach || drop.coach;
    if (!(keep.roster?.length) && drop.roster?.length) { keep.roster = drop.roster; keep.players = drop.players; }
    if ((drop.name || "").length > (keep.name || "").length) keep.name = drop.name; // prefer the official/longer name
    byDisplay.set(k, keep);
  }
  return [...byDisplay.values()].sort((a, b) => a.name.localeCompare(b.name));
}
function buildWorkspaceProspects() {
  return PROSPECTS.map((p) => {
    const ch = capitolHoopsLinesFor(p.name)[0];
    const s = ch?.stats || {};
    return {
      id: p.id, name: p.name, pos: p.position || null,
      class: p.gradYear ? String(normGradYear(p.gradYear)).slice(2) : null,
      state: SCHOOL_LOCATIONS[p.school]?.state || p.state || null,
      school: p.school || null,
      boardRank: p.boardRank ?? null,            // eval rank — null until graded
      evalGrade: p.evalGrade ?? p.eval ?? null,  // composite — null until graded
      ppg: s.ppg ?? null, gp: s.gp ?? 0,
      goldTier: !!p.goldTier,
      stars: p.stars ?? p.recruiting?.services?.["247"]?.stars ?? null,
      natl: p.rankings?.national ?? p.recruiting?.services?.["247"]?.national ?? null,
    };
  });
}
function buildWorkspaceTeams() {
  return Object.entries(CH_TEAMS).map(([slug, t]) => {
    const school = canonicalSchool(slug, t.name);
    const loc = SCHOOL_LOCATIONS[school] || {};
    const roster = (t.players || []).map((pl) => {
      const pr = PROSPECT_BY_NAMEKEY[nameKey(pl.name)];
      const a = archetypeFor(pl.name, pl.position, t.level);
      return {
        name: pl.name, pos: pl.position || null,
        class: pl.classYear ? String(pl.classYear).slice(2) : null,
        gp: pl.stats?.gp ?? 0, pts: pl.stats?.ppg ?? null, reb: pl.stats?.rpg ?? null, ast: pl.stats?.apg ?? null,
        mpg: minutesFor(pl.name)?.mpg ?? null,
        fgPct: pl.stats?.fgPct ?? null, tsPct: pl.stats?.tsPct ?? null,
        archetype: a?.label || null, archetypeEarly: a?.earlyRead || false,
        tracked: false, id: pr?.id || null, goldTier: !!pr?.goldTier, commit: pr?.commitment || null,
      };
    });
    const entries = [];
    const gmap = new Map(); // distinct played games (matchups), from game logs
    const box = { fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, to: 0, pts: 0, reb: 0 }; // summed team box (for Scout HQ playstyle)
    for (const pl of t.players || []) for (const g of gameLogFor(pl.name)) {
      entries.push({ player: pl.name, pts: g.pts, reb: g.reb, ast: g.ast, opp: g.opp, date: g.date });
      for (const k of Object.keys(box)) box[k] += g[k] || 0;
      const key = `${g.date}|${g.opp}`;
      if (!gmap.has(key)) {
        const mm = /(win|loss)\s+(\d+)\s*-\s*(\d+)/i.exec(g.result || "");
        gmap.set(key, { date: g.date, opp: g.opp, won: mm ? mm[1].toLowerCase() === "win" : null, teamScore: mm ? +mm[2] : null, oppScore: mm ? +mm[3] : null });
      }
    }
    const upcoming = gamesForTeam(t.name).filter((g) => g.status !== "final").map((g) => {
      const isHome = teamNameKey(g.home) === teamNameKey(t.name);
      return { date: g.date, time: g.time || null, opp: isHome ? g.away : g.home, isHome };
    });
    return {
      name: t.name, slug, conf: null, region: loc.state || SCHOOLS[school]?.state || null,
      level: t.level || "Summer", circuit: t.circuit || "Capitol Hoops Summer League", season: t.season || "2026",
      gp: roster.reduce((m, p) => Math.max(m, p.gp || 0), 0), coach: t.headCoach || null, roster,
      topGames: topPerformances(entries, 4),
      matchups: [...gmap.values()], upcoming,
      record: { w: [...gmap.values()].filter((g) => g.won === true).length, l: [...gmap.values()].filter((g) => g.won === false).length },
      box, teamGp: gmap.size,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

// Guarantee unique slugs across the merged Teams list (some near-duplicate school
// names collapse to the same key) so React keys + deep-links stay unique.
function uniqueSlugs(list) {
  const seen = new Set();
  return list.map((t) => {
    const base = t.slug || t.name;
    let s = base, i = 1;
    while (seen.has(s)) s = `${base}-${++i}`;
    seen.add(s);
    return s === base ? t : { ...t, slug: s };
  });
}

// A DMV school rendered as an HS-level "team" so the schools directory lives in
// the unified Teams workspace under the HS toggle (rosters now; game stats appear
// once an HS season is ingested for that program).
function schoolToTeam(s) {
  return {
    name: s.name, slug: `hs-${s.slug || schoolKey(s.name)}`, level: "HS", circuit: "High School", season: "2026",
    region: s.st || null, coach: s.coach || null, gp: 0, topGames: [],
    roster: (s.roster || []).map((r) => ({ ...r, gp: 0, pts: null, reb: null, ast: null, mpg: null, archetype: null, archetypeEarly: false })),
    directoryOnly: s.directoryOnly || false,
  };
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [recaps, setRecaps] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch("/data/prospects.json").then((r) => { if (!r.ok) throw new Error(`prospects ${r.status}`); return r.json(); }),
      fetch("/data/capitolHoops.json").then((r) => { if (!r.ok) throw new Error(`capitolHoops ${r.status}`); return r.json(); }),
      fetch("/data/schoolLocations.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
      fetch("/data/gameRecaps.json").then((r) => (r.ok ? r.json() : { recaps: [] })).catch(() => ({ recaps: [] })),
      fetch("/data/dmvSchools.json").then((r) => (r.ok ? r.json() : { schools: [] })).catch(() => ({ schools: [] })),
      fetch("/data/gameLogs.json").then((r) => (r.ok ? r.json() : { players: {} })).catch(() => ({ players: {} })),
    ])
      .then(([prospects, ch, locations, gameRecaps, dmv, logs]) => { initData(prospects, ch, locations); DMV_DIRECTORY = dmv.schools || []; GAME_LOGS = logs.players || {}; setRecaps(gameRecaps.recaps || []); setReady(true); })
      .catch((e) => setError(e.message));
  }, []);

  // Default to Summer League — the Big Board is a "coming soon" placeholder
  // until rankings are authored, so we land users on real content.
  const [view, setView] = useState("summer"); // "board" | "summer" | "commitments"
  const [openId, setOpenId] = useState(null);
  const [focusTeam, setFocusTeam] = useState(null); // team/school to preselect in the Teams workspace (e.g. from a map pin or #/team deep-link)
  const isMobile = useIsMobile(640);

  // Shareable deep links — #/player/<namekey> opens a profile directly (so a coach
  // can be texted a live page), and the open profile is reflected back into the
  // URL so it's copyable. Hash routing works on the static SPA with no router.
  useEffect(() => {
    if (!ready) return;
    const openFromHash = () => {
      const h = window.location.hash || "";
      const pth = window.location.pathname || "";
      // Player can arrive by hash (#/player/<key>) or path (/player/<key>, the
      // prerendered share/og URL).
      let m = h.match(/^#\/player\/([a-z0-9]+)/i) || pth.match(/^\/player\/([a-z0-9]+)/i);
      if (m) { const pr = PROSPECT_BY_NAMEKEY[m[1].toLowerCase()]; if (pr) setOpenId(pr.id); return; }
      m = h.match(/^#\/team\/([a-z0-9-]+)/i) || pth.match(/^\/team\/([a-z0-9-]+)/i);
      if (m) {
        // Capitol Hoops / AAU teams live in CH_TEAMS (focus by name); HS-school
        // slugs ("hs-<key>") aren't, so pass the slug — the Teams workspace
        // resolves it against the merged list (which includes the schools).
        const slug = m[1].toLowerCase();
        const t = CH_TEAMS[slug];
        setOpenId(null); setView("summer"); setFocusTeam(t ? t.name : slug);
      }
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [ready]);
  useEffect(() => {
    if (!ready || !openId) return;
    const pr = PROSPECTS.find((x) => x.id === openId);
    if (!pr) return;
    const want = `/player/${nameKey(pr.name)}`;
    if (window.location.pathname !== want) window.history.replaceState(null, "", want);
  }, [openId, ready]);

  // Standalone preview of the editorial player card: open #card in the URL.
  if (typeof window !== "undefined" && window.location.hash === "#card") {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0e16", padding: "40px 16px" }}>
        <PlayerProfileCard />
      </div>
    );
  }

  if (!ready) return <LoadingScreen error={error} />;

  const open = openId ? PROSPECTS.find((p) => p.id === openId) : null;
  const clearDeepLink = () => {
    const deep = /^#\/(player|team)\//.test(window.location.hash) || /^\/(player|team)\//.test(window.location.pathname);
    if (deep) window.history.replaceState(null, "", "/");
  };
  const goView = (v) => { setOpenId(null); setFocusTeam(null); setView(v); clearDeepLink(); };
  // Unified Teams workspace: Capitol Hoops summer teams + AAU programs (from
  // CH_TEAMS) + every DMV school as an HS-level team. The Level facet (HS/Summer/
  // AAU) splits them — so there's no separate Schools tab.
  const workspaceTeams = ready ? uniqueSlugs([...buildWorkspaceTeams(), ...buildWorkspaceSchools().map(schoolToTeam)]) : [];
  const workspaceProspects = ready ? buildWorkspaceProspects() : [];

  return (
    <div style={{ minHeight: "100vh", color: T.text }}>
      {/* News ticker */}
      <NewsTicker onOpen={setOpenId} />

      {/* Header — on phones the brand + search sit on the top row and the nav
          becomes a single horizontally-scrollable row (instead of wrapping to
          ~3 rows and eating vertical space). */}
      <header style={{ borderBottom: `1px solid ${T.border}`, padding: isMobile ? "12px 14px" : "16px 28px", display: "flex", alignItems: "center", gap: isMobile ? 10 : 16, flexWrap: "wrap" }}>
        <img src="/brand/svg/prosperahoops-lockup-dark.svg" alt="Prospera Hoops" style={{ height: isMobile ? 30 : 38, width: "auto", display: "block", order: 1 }} />
        <div style={{ marginLeft: "auto", order: isMobile ? 2 : 3, display: "flex", alignItems: "center", gap: 10 }}>
          <SearchBox onOpen={setOpenId} />
          <AccountButton onOpenAdmin={() => goView("admin")} />
        </div>
        <nav style={{
          display: "flex", gap: isMobile ? 6 : 4, order: isMobile ? 3 : 2,
          flexWrap: isMobile ? "nowrap" : "wrap",
          flexBasis: isMobile ? "100%" : "auto",
          overflowX: isMobile ? "auto" : "visible",
          WebkitOverflowScrolling: "touch",
          paddingBottom: isMobile ? 4 : 0,
          scrollbarWidth: "none",
        }}>
          {NAV.map((n) => {
            const active = view === n.key && !open;
            return (
              <button
                key={n.key}
                type="button"
                onClick={() => goView(n.key)}
                style={{
                  ...mono, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase",
                  color: active ? T.bg : T.textDim, background: active ? T.accent : "transparent",
                  border: `1px solid ${active ? T.accent : T.border}`, padding: "10px 15px", fontWeight: active ? 700 : 600,
                  flexShrink: 0, whiteSpace: "nowrap",
                }}
              >
                {n.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "18px 14px 48px" : "28px 24px 60px" }}>
        {open ? (
          <Profile prospect={open} onBack={() => { setOpenId(null); clearDeepLink(); }} onOpen={setOpenId} />
        ) : view === "prospects" ? (
          <ProspectsBoard prospects={workspaceProspects} onOpen={setOpenId} />
        ) : view === "summer" ? (
          <SummerLeagueSection recaps={recaps} teams={workspaceTeams} onOpenProfile={setOpenId} focusTeam={focusTeam} />
        ) : view === "scouthq" ? (
          <ScoutHQ teams={workspaceTeams} onOpenProfile={setOpenId} />
        ) : view === "recaps" ? (
          <RecapsFeed recaps={recaps} />
        ) : view === "map" ? (
          <DmvMap onOpenSchool={(name) => { setOpenId(null); setFocusTeam(name); setView("summer"); }} />
        ) : view === "classes" ? (
          <Classes onOpen={setOpenId} />
        ) : view === "commitments" ? (
          <CommitmentsTracker onOpen={setOpenId} />
        ) : view === "admin" ? (
          <AdminClaims onOpenProfile={setOpenId} />
        ) : (
          <BoardComingSoon />
        )}
      </main>
    </div>
  );
}
