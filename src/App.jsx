import React, { useMemo, useState } from "react";
import PROSPECTS_DATA from "./data/prospects.json";
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

function Avatar({ name, size = 56 }) {
  const initials = (name || "").split(/\s+/).map((s) => s[0] || "").join("").slice(0, 2).toUpperCase() || "?";
  return (
    <div
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${T.surface2}, ${T.surface})`,
        border: `1px solid ${T.accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
    >
      <span style={{ ...mono, fontSize: size * 0.32, color: T.accent, fontWeight: 700 }}>{initials}</span>
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
            <Avatar name={p.name} size={48} />
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

      {/* Hero */}
      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap", background: T.surface, border: `1px solid ${T.border}`, padding: 20 }}>
        <Avatar name={p.name} size={80} />
        <div style={{ flex: "1 1 260px", minWidth: 0 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 28, margin: 0, color: T.text, fontWeight: 800, letterSpacing: "-0.02em" }}>{p.name}</h1>
            <Stars count={p.stars} />
          </div>
          <div style={{ ...mono, fontSize: 11, color: T.textDim, letterSpacing: "0.08em", marginTop: 8 }}>
            {p.position} · {fmtHeight(p.heightInches)} · {p.weightLbs} lb · Class of {p.gradYear}
          </div>
          <div style={{ ...mono, fontSize: 11, color: T.textMute, letterSpacing: "0.06em", marginTop: 4 }}>
            {p.school} · {STATE_LABELS[p.state] || p.state}{p.aau ? ` · ${p.aau}` : ""}
          </div>
          <div style={{ marginTop: 12 }}>
            <StatusBadge status={p.status} commitment={p.commitment} />
          </div>
        </div>
        {/* Rankings block */}
        <div style={{ display: "flex", gap: 18 }}>
          <RankStat label="National" value={p.rankings?.national} />
          <RankStat label="Position" value={p.rankings?.position} />
          <RankStat label={STATE_LABELS[p.state] || "State"} value={p.rankings?.state} />
        </div>
      </div>

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

function OverviewTab({ p }) {
  const s = p.stats || {};
  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* Summary */}
      {p.summary && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: 18 }}>
          <SectionLabel>Scout Summary</SectionLabel>
          <p style={{ fontSize: 14, color: T.text, lineHeight: 1.6, margin: "10px 0 0" }}>{p.summary}</p>
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

      {/* Stats */}
      {Object.keys(s).length > 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: 18 }}>
          <SectionLabel>Season Averages</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(70px, 1fr))", gap: 12, marginTop: 14 }}>
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

function StatCell({ label, value }) {
  return (
    <div style={{ textAlign: "center", background: T.surface2, border: `1px solid ${T.borderSoft}`, padding: "10px 6px" }}>
      <div style={{ ...mono, fontSize: 9, letterSpacing: "0.12em", color: T.textMute, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 18, color: T.text, fontWeight: 700, marginTop: 4 }}>{value != null ? value : "—"}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// APP
// ---------------------------------------------------------------------------
export default function App() {
  const [openId, setOpenId] = useState(null);
  const open = openId ? PROSPECTS.find((p) => p.id === openId) : null;

  return (
    <div style={{ minHeight: "100vh", color: T.text }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${T.border}`, padding: "18px 28px", display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
        <div style={{ ...mono, fontSize: 16, letterSpacing: "0.18em", color: T.accent, fontWeight: 800, textTransform: "uppercase" }}>
          Prospera Preps
        </div>
        <div style={{ ...mono, fontSize: 10, letterSpacing: "0.16em", color: T.textMute, textTransform: "uppercase" }}>
          DMV Recruiting Board · Basketball
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 60px" }}>
        {open ? (
          <Profile prospect={open} onBack={() => setOpenId(null)} />
        ) : (
          <Board onOpen={setOpenId} />
        )}
      </main>
    </div>
  );
}
