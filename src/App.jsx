import React, { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import NEWS_DATA from "./data/news.json";
import ProspectFilm from "./components/ProspectFilm";

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

const mono = {
  fontFamily: 'ui-monospace, "IBM Plex Mono", "SF Mono", Menlo, Consolas, monospace',
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

// Schools, grouped from the prospect list, with coach pulled from the matching
// Capitol Hoops team where derivable.
let SCHOOLS = {};
let SCHOOL_LOCATIONS = {}; // { schoolName: { lat, lng, state, county } }

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
                {p.position} · {p.school} · {STATE_LABELS[p.state] || p.state} · '{String(p.gradYear).slice(2)}
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
// PROFILE — hero + tabs
// ---------------------------------------------------------------------------
const PROFILE_TABS = ["Overview", "Film"];

function Profile({ prospect, onBack }) {
  const [tab, setTab] = useState("Overview");
  const p = prospect;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <button
        type="button"
        onClick={onBack}
        style={{ ...mono, fontSize: 11, letterSpacing: "0.14em", color: T.signal, background: "transparent", border: "none", textTransform: "uppercase", justifySelf: "start", padding: 0 }}
      >
        ← Back to board
      </button>

      {/* Hero — headshot-forward, immersive. Measurables/rankings render only
          when present so thin (auto-promoted) profiles stay clean. */}
      <div style={{
        background: `linear-gradient(135deg, var(--prospera-accent-bg-mid) 0%, ${T.surface} 55%)`,
        border: `1px solid ${T.border}`,
        borderLeft: `3px solid ${T.accent}`,
        padding: 22,
        display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap",
      }}>
        <Avatar name={p.name} headshot={p.headshot} size={120} />
        <div style={{ flex: "1 1 280px", minWidth: 0 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 32, margin: 0, color: T.text, fontWeight: 800, letterSpacing: "-0.02em" }}>{p.name}</h1>
            {p.stars ? <Stars count={p.stars} /> : null}
          </div>
          {/* Chip row — only non-empty facts */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <Chip>{p.position || "—"}</Chip>
            <Chip>Class of {p.gradYear || "—"}</Chip>
            {p.heightInches ? <Chip>{fmtHeight(p.heightInches)}{p.wingspanInches ? ` · ${fmtHeight(p.wingspanInches)} ws` : ""}{p.weightLbs ? ` · ${p.weightLbs} lb` : ""}</Chip> : null}
          </div>
          <div style={{ ...mono, fontSize: 11, color: T.textMute, letterSpacing: "0.06em", marginTop: 10 }}>
            {p.school}{p.city ? ` · ${p.city}, ${p.state}` : (p.state ? ` · ${STATE_LABELS[p.state] || p.state}` : "")}{p.aau ? ` · ${p.aau}` : ""}
          </div>
          <div style={{ marginTop: 12 }}>
            <StatusBadge status={p.status} commitment={p.commitment} />
          </div>
        </div>
        {/* Rankings — only show the block if at least one rank exists */}
        {(p.rankings?.national || p.rankings?.position || p.rankings?.state) ? (
          <div style={{ display: "flex", gap: 18 }}>
            <RankStat label="National" value={p.rankings?.national} />
            <RankStat label="Position" value={p.rankings?.position} />
            <RankStat label={STATE_LABELS[p.state] || "State"} value={p.rankings?.state} />
          </div>
        ) : null}
      </div>

      {/* Headline stats — the at-a-glance line so the profile leads with a
          visual, not a wall of numbers. Pulled from the primary stat context. */}
      <HeadlineStats p={p} />

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${T.border}` }}>
        {PROFILE_TABS.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                ...mono, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
                color: active ? T.accent : T.textDim, background: "transparent", border: "none",
                padding: "12px 18px", borderBottom: `2px solid ${active ? T.accent : "transparent"}`,
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {tab === "Overview" && <OverviewTab p={p} />}
      {tab === "Film" && <ProspectFilm prospectName={p.name} />}
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
  const all = [...(Array.isArray(p.statLines) ? p.statLines : []), ...capitolHoopsLinesFor(p.name)];
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
    { label: "GP",  value: perGame(s.gp != null ? s.gp : line.gp), accent: false },
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
  const statLines = [...authoredLines, ...capitolHoopsLinesFor(p.name)];
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
  return (
    <div style={{ ...mono, fontSize: 9, letterSpacing: "0.2em", color: T.signal, textTransform: "uppercase", fontWeight: 700 }}>
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
        { label: "GP", value: perGame(gp), tone: "lead" },
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
  const [mode, setMode] = useState("teams"); // "teams" | "leaders"
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
        <Segmented value={mode} onChange={setMode} options={[["teams", "Teams"], ["leaders", "Leaders"]]} />
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
        Across all {allPlayers.length} players · 2026 Capitol Hoops · GP shown on every line · % boards require 2+ games
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
                    <button type="button" onClick={() => onOpenProfile(tracked.id)} style={{ ...mono, fontSize: 12, color: T.text, background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left", fontWeight: 600 }}>
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

function SummerTeam({ team, onBack, onOpenProfile }) {
  const [sortKey, setSortKey] = useState("ppg");
  const sorted = useMemo(() => {
    return [...team.players].sort((a, b) => (b.stats?.[sortKey] ?? -1) - (a.stats?.[sortKey] ?? -1));
  }, [team, sortKey]);

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
        <h2 style={{ fontSize: 22, margin: 0, color: T.text, fontWeight: 800 }}>{team.name}</h2>
        <div style={{ ...mono, fontSize: 10, color: T.textMute, letterSpacing: "0.08em", marginTop: 6 }}>
          Capitol Hoops {team.season} · {team.headCoach} · {team.players.length} players
        </div>
      </div>

      {/* Roster + stats table — GP leads, sortable by stat columns */}
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
                  <td style={tdStyle("left", T.textDim)}>{pl.classYear ? `'${String(pl.classYear).slice(2)}` : "—"}</td>
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
// SCHOOLS — every DMV school in the database, each with its roster
// ---------------------------------------------------------------------------
function Schools({ onOpenProfile }) {
  const [schoolName, setSchoolName] = useState(null);
  const school = schoolName ? SCHOOLS[schoolName] : null;

  if (school) return <SchoolDetail school={school} onBack={() => setSchoolName(null)} onOpenProfile={onOpenProfile} />;

  const list = useMemo(
    () => Object.values(SCHOOLS).sort((a, b) => b.prospects.length - a.prospects.length || a.name.localeCompare(b.name)),
    []
  );

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <SectionLabel>DMV Schools</SectionLabel>
        <p style={{ fontSize: 13, color: T.textDim, lineHeight: 1.5, margin: "8px 0 0", maxWidth: 640 }}>
          Every school in the database. Tap one for its roster and player profiles.
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
        {list.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => setSchoolName(s.name)}
            style={{ textAlign: "left", background: T.surface, border: `1px solid ${T.border}`, padding: 16, cursor: "pointer", color: T.text }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--prospera-accent-border)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--prospera-border)")}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{s.name}</div>
            <div style={{ ...mono, fontSize: 10, color: T.textMute, letterSpacing: "0.08em", marginTop: 6 }}>
              {s.prospects.length} players{s.coach ? ` · ${s.coach}` : ""}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SchoolDetail({ school, onBack, onOpenProfile }) {
  const roster = useMemo(() => {
    return [...school.prospects].map((p) => {
      const line = primaryStatLine(p);
      return { p, ppg: line?.stats?.ppg ?? null, gp: line?.stats?.gp ?? line?.gp ?? null };
    }).sort((a, b) => (b.ppg ?? -1) - (a.ppg ?? -1));
  }, [school]);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <button type="button" onClick={onBack} style={{ ...mono, fontSize: 11, letterSpacing: "0.14em", color: T.signal, background: "transparent", border: "none", textTransform: "uppercase", justifySelf: "start", padding: 0 }}>
        ← All schools
      </button>
      <div style={{ background: `linear-gradient(135deg, var(--prospera-accent-bg-mid) 0%, ${T.surface} 60%)`, border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.accent}`, padding: 22 }}>
        <h2 style={{ fontSize: 26, margin: 0, color: T.text, fontWeight: 800 }}>{school.name}</h2>
        <div style={{ ...mono, fontSize: 10, color: T.textMute, letterSpacing: "0.08em", marginTop: 8 }}>
          {school.prospects.length} players{school.coach ? ` · ${school.coach}` : ""}{school.state ? ` · ${STATE_LABELS[school.state] || school.state}` : ""}
        </div>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {roster.map(({ p, ppg, gp }) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onOpenProfile(p.id)}
            style={{ display: "grid", gridTemplateColumns: "48px 1fr auto", gap: 14, alignItems: "center", textAlign: "left", background: T.surface, border: `1px solid ${T.border}`, padding: "10px 16px", cursor: "pointer", color: T.text }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--prospera-accent-border)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--prospera-border)")}
          >
            <Avatar name={p.name} headshot={p.headshot} size={40} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
              <div style={{ ...mono, fontSize: 10, color: T.textMute, letterSpacing: "0.06em", marginTop: 2 }}>
                {p.position || "—"}{p.gradYear ? ` · '${String(p.gradYear).slice(2)}` : ""}
              </div>
            </div>
            <div style={{ ...mono, fontSize: 12, color: ppg != null ? T.accent : T.textMute, fontWeight: 700, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {ppg != null ? `${perGame(ppg)} PPG` : "—"}{gp != null ? <span style={{ color: T.textMute, fontWeight: 400 }}> · {gp} GP</span> : null}
            </div>
          </button>
        ))}
      </div>
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
                  {p.position} · {p.school} · {STATE_LABELS[p.state] || p.state} · '{String(p.gradYear).slice(2)}
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
const MAP_STATE_COLOR = { DC: "var(--prospera-signal)", MD: "var(--prospera-blue)", VA: "var(--prospera-positive)" };

function DmvMap({ onOpenProfile }) {
  const [openSchool, setOpenSchool] = useState(null);
  const containerRef = useRef(null);

  const points = useMemo(() => {
    const out = [];
    for (const [name, loc] of Object.entries(SCHOOL_LOCATIONS)) {
      const s = SCHOOLS[name];
      if (!s || loc.lat == null || loc.lng == null) continue;
      out.push({ name, lat: loc.lat, lng: loc.lng, state: s.state || loc.state || null, count: s.prospects.length });
    }
    return out;
  }, []);

  // Build a real Leaflet map with dark basemap tiles. Leaflet is dynamically
  // imported so it stays out of the main bundle (loads only on this tab).
  useEffect(() => {
    if (openSchool || !containerRef.current) return undefined;
    let map;
    let cancelled = false;
    import("leaflet").then(({ default: L }) => {
      if (cancelled || !containerRef.current) return;
      map = L.map(containerRef.current, { scrollWheelZoom: true, attributionControl: true });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap &copy; CARTO',
      }).addTo(map);

      const cssColor = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || v;
      const palette = { DC: cssColor("--prospera-signal"), MD: cssColor("--prospera-blue"), VA: cssColor("--prospera-positive") };

      const latlngs = [];
      for (const p of points) {
        const color = palette[p.state] || "#94A3B8";
        const marker = L.circleMarker([p.lat, p.lng], {
          radius: 5 + Math.sqrt(p.count) * 2.2,
          color, weight: 1.5, fillColor: color, fillOpacity: 0.5,
        }).addTo(map);
        marker.bindTooltip(`${p.name} · ${p.count} player${p.count === 1 ? "" : "s"}`, { direction: "top" });
        marker.on("mouseover", () => marker.setStyle({ fillOpacity: 0.85, weight: 2.5 }));
        marker.on("mouseout", () => marker.setStyle({ fillOpacity: 0.5, weight: 1.5 }));
        marker.on("click", () => setOpenSchool(p.name));
        latlngs.push([p.lat, p.lng]);
      }
      if (latlngs.length) map.fitBounds(L.latLngBounds(latlngs).pad(0.08));
      else map.setView([38.9, -77.0], 9);
    });
    return () => { cancelled = true; if (map) map.remove(); };
  }, [openSchool, points]);

  if (openSchool && SCHOOLS[openSchool]) {
    return <SchoolDetail school={SCHOOLS[openSchool]} onBack={() => setOpenSchool(null)} onOpenProfile={onOpenProfile} />;
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <SectionLabel>DMV Talent Map</SectionLabel>
          <p style={{ fontSize: 13, color: T.textDim, lineHeight: 1.5, margin: "8px 0 0", maxWidth: 620 }}>
            Every school in the database, plotted on the map. Marker size = roster count. Click a school for its page.
          </p>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {Object.entries(MAP_STATE_COLOR).map(([st, c]) => (
            <span key={st} style={{ ...mono, fontSize: 10, letterSpacing: "0.1em", color: T.textDim, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: c, display: "inline-block" }} />
              {STATE_LABELS[st] || st}
            </span>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        style={{ height: 600, width: "100%", background: T.surface, border: `1px solid ${T.border}` }}
      />

      <div style={{ ...mono, fontSize: 9, color: T.textMute, letterSpacing: "0.06em" }}>
        {points.length} schools mapped · tiles &copy; CARTO / OpenStreetMap · scroll to zoom, drag to pan
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
                {p.position || "—"} · {p.school}{p.gradYear ? ` · '${String(p.gradYear).slice(2)}` : ""}
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
      const y = p.gradYear || null;
      if (!y) continue;
      (m[y] = m[y] || []).push(p);
    }
    return m;
  }, []);
  const years = Object.keys(byYear).map(Number).sort();

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
            <div style={{ fontSize: 24, fontWeight: 800, color: T.accent }}>'{String(y).slice(2)}</div>
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
  { key: "board", label: "Big Board" },
  { key: "summer", label: "Summer League" },
  { key: "schools", label: "Schools" },
  { key: "map", label: "Map" },
  { key: "classes", label: "Classes" },
  { key: "commitments", label: "Commitments" },
];

function LoadingScreen({ error }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <div style={{ ...mono, fontSize: 12, letterSpacing: "0.3em", color: T.accent, textTransform: "uppercase", fontWeight: 800 }}>
        Prospera Preps
      </div>
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

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/prospects.json").then((r) => { if (!r.ok) throw new Error(`prospects ${r.status}`); return r.json(); }),
      fetch("/data/capitolHoops.json").then((r) => { if (!r.ok) throw new Error(`capitolHoops ${r.status}`); return r.json(); }),
      fetch("/data/schoolLocations.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    ])
      .then(([prospects, ch, locations]) => { initData(prospects, ch, locations); setReady(true); })
      .catch((e) => setError(e.message));
  }, []);

  // Default to Summer League — the Big Board is a "coming soon" placeholder
  // until rankings are authored, so we land users on real content.
  const [view, setView] = useState("summer"); // "board" | "summer" | "commitments"
  const [openId, setOpenId] = useState(null);

  if (!ready) return <LoadingScreen error={error} />;

  const open = openId ? PROSPECTS.find((p) => p.id === openId) : null;
  const goView = (v) => { setOpenId(null); setView(v); };

  return (
    <div style={{ minHeight: "100vh", color: T.text }}>
      {/* News ticker */}
      <NewsTicker onOpen={setOpenId} />

      {/* Header */}
      <header style={{ borderBottom: `1px solid ${T.border}`, padding: "16px 28px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ ...mono, fontSize: 16, letterSpacing: "0.18em", color: T.accent, fontWeight: 800, textTransform: "uppercase" }}>
          Prospera Preps
        </div>
        <nav style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {NAV.map((n) => {
            const active = view === n.key && !open;
            return (
              <button
                key={n.key}
                type="button"
                onClick={() => goView(n.key)}
                style={{
                  ...mono, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
                  color: active ? T.bg : T.textDim, background: active ? T.accent : "transparent",
                  border: `1px solid ${active ? T.accent : T.border}`, padding: "7px 12px", fontWeight: active ? 700 : 500,
                }}
              >
                {n.label}
              </button>
            );
          })}
        </nav>
        <div style={{ marginLeft: "auto" }}>
          <SearchBox onOpen={setOpenId} />
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 60px" }}>
        {open ? (
          <Profile prospect={open} onBack={() => setOpenId(null)} />
        ) : view === "summer" ? (
          <SummerLeague onOpenProfile={setOpenId} />
        ) : view === "schools" ? (
          <Schools onOpenProfile={setOpenId} />
        ) : view === "map" ? (
          <DmvMap onOpenProfile={setOpenId} />
        ) : view === "classes" ? (
          <Classes onOpen={setOpenId} />
        ) : view === "commitments" ? (
          <CommitmentsTracker onOpen={setOpenId} />
        ) : (
          <BoardComingSoon />
        )}
      </main>
    </div>
  );
}
