import React, { useMemo, useState } from "react";
import PROSPECTS_DATA from "./data/prospects.json";
import CAPITOL_HOOPS from "./data/capitolHoops.json";
import ProspectFilm from "./components/ProspectFilm";

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

const PROSPECTS = PROSPECTS_DATA.prospects || [];

const STATE_LABELS = { DC: "D.C.", MD: "Maryland", VA: "Virginia" };

// ---------------------------------------------------------------------------
// Capitol Hoops Summer League join. Players are matched to tracked prospects
// by name-slug (same bridge pattern used across the framework). Two directions:
//   - capitolHoopsLinesFor(name) → summer stat lines to merge into a profile
//   - PROSPECT_BY_NAMEKEY        → does a summer player have a tracked profile?
// ---------------------------------------------------------------------------
const CH_TEAMS = CAPITOL_HOOPS.teams || {};

function nameKey(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

const PROSPECT_BY_NAMEKEY = (() => {
  const m = {};
  for (const p of PROSPECTS) m[nameKey(p.name)] = p;
  return m;
})();

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
    { label: "PPG", value: s.ppg },
    { label: "RPG", value: s.rpg },
    { label: "APG", value: s.apg },
    { label: "GP",  value: s.gp != null ? s.gp : line.gp },
  ];
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: "16px 20px" }}>
      <div style={{ ...mono, fontSize: 9, letterSpacing: "0.16em", color: T.textMute, textTransform: "uppercase", marginBottom: 12 }}>
        {line.context}{line.season ? ` · ${line.season}` : ""}{line.league ? ` · ${line.league}` : ""}
      </div>
      <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
        {items.map((it) => (
          <div key={it.label}>
            <div style={{ fontSize: 34, color: it.label === "GP" ? T.textDim : T.accent, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>
              {it.value != null ? it.value : "—"}
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

function StatCell({ label, value, highlight = false }) {
  return (
    <div style={{
      textAlign: "center",
      background: highlight ? "var(--prospera-accent-bg)" : T.surface2,
      border: `1px solid ${highlight ? "var(--prospera-accent-border)" : T.borderSoft}`,
      padding: "10px 6px",
    }}>
      <div style={{ ...mono, fontSize: 9, letterSpacing: "0.12em", color: highlight ? T.accent : T.textMute, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 18, color: T.text, fontWeight: 700, marginTop: 4 }}>{value != null ? value : "—"}</div>
    </div>
  );
}

// One stat context (HS Season / Summer / Capitol Hoops / Fall) — a labeled
// header above the per-game grid. GP leads (highlighted) so small-sample
// summer lines can't be misread as stable averages.
function StatLineBlock({ line }) {
  const s = line.stats || {};
  const smallSample = line.gp != null && line.gp <= 3;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ ...mono, fontSize: 11, letterSpacing: "0.1em", color: T.accent, textTransform: "uppercase", fontWeight: 700 }}>
          {line.context}
        </span>
        <span style={{ ...mono, fontSize: 10, letterSpacing: "0.06em", color: T.textMute }}>
          {[line.season, line.team, line.league].filter(Boolean).join(" · ")}
        </span>
        {smallSample && (
          <span style={{ ...mono, fontSize: 9, letterSpacing: "0.1em", color: T.warn, textTransform: "uppercase" }}>
            · small sample
          </span>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(60px, 1fr))", gap: 8 }}>
        <StatCell label="GP" value={s.gp != null ? s.gp : line.gp} highlight />
        <StatCell label="PPG" value={s.ppg} />
        <StatCell label="RPG" value={s.rpg} />
        <StatCell label="APG" value={s.apg} />
        <StatCell label="SPG" value={s.spg} />
        <StatCell label="BPG" value={s.bpg} />
        <StatCell label="FG%" value={s.fgPct} />
        <StatCell label="3P%" value={s.threePct} />
        <StatCell label="FT%" value={s.ftPct} />
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
  const team = teamSlug ? CH_TEAMS[teamSlug] : null;

  if (!team) {
    const slugs = Object.keys(CH_TEAMS);
    return (
      <div style={{ display: "grid", gap: 18 }}>
        <div>
          <SectionLabel>Capitol Hoops Summer League · 2026</SectionLabel>
          <p style={{ fontSize: 13, color: T.textDim, lineHeight: 1.5, margin: "8px 0 0", maxWidth: 640 }}>
            Live summer-league rosters and box-score averages across the DMV. Small samples —
            games played leads every line. Tap a team to see its roster.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {slugs.map((slug) => {
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
      </div>
    );
  }

  return <SummerTeam team={team} onBack={() => setTeamSlug(null)} onOpenProfile={onOpenProfile} />;
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
              <th style={{ ...thStyle("right"), color: T.accent }}>GP</th>
              {SUMMER_STAT_COLS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => setSortKey(c.key)}
                  style={{ ...thStyle("right"), cursor: "pointer", color: sortKey === c.key ? T.accent : T.textDim }}
                >
                  {c.label}{sortKey === c.key ? " ↓" : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((pl) => {
              const tracked = PROSPECT_BY_NAMEKEY[nameKey(pl.name)];
              return (
                <tr key={pl.number + pl.name} style={{ borderBottom: `1px solid ${T.borderSoft}` }}>
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
                  <td style={tdStyle("left", T.textDim)}>'{String(pl.classYear).slice(2)}</td>
                  <td style={{ ...tdStyle("right", T.text), fontWeight: 700, background: "var(--prospera-accent-bg-faint)" }}>{pl.stats?.gp ?? "—"}</td>
                  {SUMMER_STAT_COLS.map((c) => (
                    <td key={c.key} style={tdStyle("right", sortKey === c.key ? T.text : T.textDim)}>
                      {pl.stats?.[c.key] != null ? pl.stats[c.key] : "—"}
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
// APP
// ---------------------------------------------------------------------------
const NAV = [
  { key: "board", label: "Big Board" },
  { key: "summer", label: "Summer League" },
  { key: "commitments", label: "Commitments" },
];

export default function App() {
  const [view, setView] = useState("board"); // "board" | "summer"
  const [openId, setOpenId] = useState(null);
  const open = openId ? PROSPECTS.find((p) => p.id === openId) : null;

  const goView = (v) => { setOpenId(null); setView(v); };

  return (
    <div style={{ minHeight: "100vh", color: T.text }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${T.border}`, padding: "16px 28px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div style={{ ...mono, fontSize: 16, letterSpacing: "0.18em", color: T.accent, fontWeight: 800, textTransform: "uppercase" }}>
          Prospera Preps
        </div>
        <nav style={{ display: "flex", gap: 4 }}>
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
        <div style={{ ...mono, fontSize: 10, letterSpacing: "0.16em", color: T.textMute, textTransform: "uppercase", marginLeft: "auto" }}>
          DMV · Basketball
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 60px" }}>
        {open ? (
          <Profile prospect={open} onBack={() => setOpenId(null)} />
        ) : view === "summer" ? (
          <SummerLeague onOpenProfile={setOpenId} />
        ) : view === "commitments" ? (
          <CommitmentsTracker onOpen={setOpenId} />
        ) : (
          <Board onOpen={setOpenId} />
        )}
      </main>
    </div>
  );
}
