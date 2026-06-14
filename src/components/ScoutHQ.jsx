// Scout HQ — coach analytics tier (v2). All v1 features run on box scores and are
// labeled "est". Truly unprovable metrics (lineup efficiency, on/off, net rating,
// player-vs-defender H2H) are shown as LOCKED cards — visible, never faked.
// Tabs: Opponents · Matchups · Players · My Team · Lists & Notes. Coach inputs,
// lists, and notes persist to localStorage.
import React, { useState, useMemo } from "react";
import { T, ui, display, inputStyle } from "../lib/theme.js";
import { teamPlaystyle, topScorerShare, pctRank, useHQStore } from "../lib/scoutHQ.js";
import { useAuth } from "../lib/auth.jsx";
import { useCoachAccess } from "../lib/coachAccess.js";

const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 };
const lab = { ...ui, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, color: T.textMute };
const num = (v, suffix = "") => (v == null ? "—" : `${v}${suffix}`);

const Tag = ({ children, color = T.textMute }) => (
  <span style={{ ...ui, fontSize: 8.5, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: 3, padding: "1px 5px" }}>{children}</span>
);
const Sel = (props) => <select {...props} style={{ ...inputStyle, maxWidth: 320 }} />;

function LockedCard({ title, why }) {
  return (
    <div style={{ ...card, borderStyle: "dashed", opacity: 0.85 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ ...lab, color: T.textMute }}>🔒 {title}</span>
        <Tag color={T.warn}>Locked</Tag>
      </div>
      <div style={{ ...ui, fontSize: 12, color: T.textMute, lineHeight: 1.5, marginTop: 8 }}>{why}</div>
    </div>
  );
}

// --- team metric catalog (playstyle, all est) ------------------------------
const TEAM_METRICS = [
  { key: "ppg", label: "PPG", hi: "high" },
  { key: "pace", label: "Pace", hi: "none", est: true },
  { key: "efg", label: "eFG%", hi: "high", suffix: "%" },
  { key: "ts", label: "TS%", hi: "high", suffix: "%" },
  { key: "threePArate", label: "3PA rate", hi: "none", suffix: "%", est: true },
  { key: "ftRate", label: "FT rate", hi: "high", suffix: "%", est: true },
  { key: "astRate", label: "AST rate", hi: "high", suffix: "%", est: true },
  { key: "tovRate", label: "TOV rate", hi: "low", suffix: "%", est: true },
  { key: "orebRate", label: "OREB rate", hi: "high", suffix: "%", est: true },
];

function PlaystyleColumn({ ps, share, label }) {
  if (!ps) return <div style={card}><div style={lab}>{label}</div><div style={{ ...ui, fontSize: 12, color: T.textMute, marginTop: 8 }}>No box-score data yet.</div></div>;
  return (
    <div style={card}>
      <div style={lab}>{label}</div>
      <div style={{ display: "grid", gap: 7, marginTop: 12 }}>
        {TEAM_METRICS.map((m) => (
          <div key={m.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <span style={{ ...ui, fontSize: 11.5, color: T.textDim }}>{m.label} {m.est && <Tag>est</Tag>}</span>
            <span style={{ ...display, fontSize: 15, fontWeight: 700, color: T.text, fontVariantNumeric: "tabular-nums" }}>{num(ps[m.key], m.suffix)}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span style={{ ...ui, fontSize: 11.5, color: T.textDim }}>Points mix (2/3/FT)</span>
          <span style={{ ...display, fontSize: 14, fontWeight: 700, color: T.text }}>{ps.mix.two}/{ps.mix.three}/{ps.mix.ft}</span>
        </div>
        {share && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <span style={{ ...ui, fontSize: 11.5, color: T.textDim }}>Top-scorer load</span>
            <span style={{ ...ui, fontSize: 12, color: T.accent, fontWeight: 700 }}>{share.player} · {share.pct}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

// --- TAB 1: Opponents -------------------------------------------------------
function OpponentsTab({ teams, store, update }) {
  const withData = teams.filter((t) => (t.teamGp || 0) > 0);
  const [mineSlug, setMine] = useState(withData[0]?.slug || "");
  const [oppSlug, setOpp] = useState(withData[1]?.slug || "");
  const mine = teams.find((t) => t.slug === mineSlug);
  const opp = teams.find((t) => t.slug === oppSlug);
  const mPs = mine && teamPlaystyle(mine.box, mine.teamGp);
  const oPs = opp && teamPlaystyle(opp.box, opp.teamGp);
  const pairKey = `${mineSlug}__${oppSlug}`;
  const input = (store.opponentInput || {})[pairKey] || { defense: "", press: "", likeTo: "", watch: "", keyMatchup: "", custom: [], keys: [] };
  const setInput = (patch) => update((p) => ({ ...p, opponentInput: { ...(p.opponentInput || {}), [pairKey]: { ...input, ...patch } } }));

  const autoKeys = useMemo(() => {
    if (!mPs || !oPs) return [];
    const out = [];
    if (oPs.pace - mPs.pace > 4) out.push(`${opp.name} plays faster (${oPs.pace} vs ${mPs.pace} poss/g) — control tempo.`);
    if (mPs.pace - oPs.pace > 4) out.push(`You play faster — push pace to stress them.`);
    if (oPs.threePArate >= 45) out.push(`${opp.name} is 3-heavy (${oPs.threePArate}% of FGA) — run shooters off the line.`);
    if (oPs.orebRate >= 35) out.push(`${opp.name} crashes the offensive glass (${oPs.orebRate}% est) — box out.`);
    const threats = (opp.roster || []).filter((p) => p.pts != null && (p.gp || 0) > 0).sort((a, b) => b.pts - a.pts).slice(0, 1);
    if (threats[0]) out.push(`Limit ${threats[0].name} (${threats[0].pts} ppg) — their top scorer.`);
    return out;
  }, [mPs, oPs, opp]);

  const threats = (opp?.roster || []).filter((p) => p.pts != null && (p.gp || 0) > 0).sort((a, b) => b.pts - a.pts).slice(0, 3);
  const fields = [["defense", "Defense"], ["press", "Press / pressure"], ["likeTo", "They like to…"], ["watch", "Watch for"], ["keyMatchup", "Key matchup"]];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <span style={lab}>My team</span><Sel value={mineSlug} onChange={(e) => setMine(e.target.value)}>{withData.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}</Sel>
        <span style={{ ...lab, marginLeft: 8 }}>Opponent</span><Sel value={oppSlug} onChange={(e) => setOpp(e.target.value)}>{teams.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}</Sel>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={lab}>Playstyle</span><Tag color={T.accent2 || "#6fae9b"}>Auto · from box scores</Tag></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        <PlaystyleColumn ps={mPs} share={mine && topScorerShare(mine.roster)} label={`${mine?.name || "—"} (you)`} />
        <PlaystyleColumn ps={oPs} share={opp && topScorerShare(opp.roster)} label={opp?.name || "—"} />
      </div>

      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={lab}>Top threats</span><Tag color={T.accent2 || "#6fae9b"}>Auto</Tag></div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10 }}>
          {threats.length ? threats.map((p) => (
            <span key={p.name} style={{ ...ui, fontSize: 12, color: T.textDim }}><b style={{ color: T.text }}>{p.name}</b> <span style={{ color: T.accent, fontWeight: 700 }}>{p.pts} ppg</span>{p.archetype ? ` · ${p.archetype}` : ""}</span>
          )) : <span style={{ ...ui, fontSize: 12, color: T.textMute }}>No stats yet.</span>}
        </div>
      </div>

      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={lab}>Coach's scouting input</span><Tag>Coach</Tag></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          {fields.map(([k, l]) => (
            <label key={k} style={{ display: "grid", gap: 5 }}>
              <span style={{ ...ui, fontSize: 10.5, color: T.textMute, textTransform: "uppercase", letterSpacing: "0.08em" }}>{l}</span>
              <input style={inputStyle} value={input[k] || ""} onChange={(e) => setInput({ [k]: e.target.value })} placeholder="…" />
            </label>
          ))}
          {(input.custom || []).map((c, i) => (
            <label key={i} style={{ display: "grid", gap: 5 }}>
              <input style={{ ...inputStyle, fontSize: 10.5 }} value={c.label} onChange={(e) => { const custom = input.custom.slice(); custom[i] = { ...custom[i], label: e.target.value }; setInput({ custom }); }} placeholder="Field name" />
              <input style={inputStyle} value={c.value} onChange={(e) => { const custom = input.custom.slice(); custom[i] = { ...custom[i], value: e.target.value }; setInput({ custom }); }} placeholder="…" />
            </label>
          ))}
        </div>
        <button type="button" onClick={() => setInput({ custom: [...(input.custom || []), { label: "", value: "" }] })} style={{ ...ui, fontSize: 11, color: T.signal, background: "transparent", border: `1px dashed ${T.border}`, borderRadius: 6, padding: "7px 12px", cursor: "pointer", marginTop: 12 }}>+ Add field</button>
      </div>

      <div style={card}>
        <span style={lab}>Keys to the game</span>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {autoKeys.map((k, i) => <div key={`a${i}`} style={{ ...ui, fontSize: 12.5, color: T.textDim, display: "flex", gap: 8 }}><Tag color={T.accent2 || "#6fae9b"}>Auto</Tag> {k}</div>)}
          {(input.keys || []).map((k, i) => (
            <div key={`c${i}`} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Tag>Coach</Tag>
              <input style={{ ...inputStyle, flex: 1 }} value={k} onChange={(e) => { const keys = input.keys.slice(); keys[i] = e.target.value; setInput({ keys }); }} />
              <button type="button" onClick={() => setInput({ keys: input.keys.filter((_, j) => j !== i) })} style={{ ...ui, fontSize: 11, color: T.danger, background: "transparent", border: "none", cursor: "pointer" }}>×</button>
            </div>
          ))}
          <button type="button" onClick={() => setInput({ keys: [...(input.keys || []), ""] })} style={{ ...ui, fontSize: 11, color: T.signal, background: "transparent", border: `1px dashed ${T.border}`, borderRadius: 6, padding: "7px 12px", cursor: "pointer", justifySelf: "start" }}>+ Add key</button>
        </div>
      </div>

      <LockedCard title="True lineup efficiency / on-off" why="Needs tracked possessions (who was on the floor each play). Not derivable from box scores — locked until that data exists." />
    </div>
  );
}

// --- compare helper (two-side stat rows, winner highlighted) ---------------
function CompareRows({ rows }) {
  return (
    <div style={{ display: "grid", gap: 1, background: T.border, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
      {rows.map((r) => {
        const aWin = r.aWin, bWin = r.bWin;
        return (
          <div key={r.label} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", background: T.surface, padding: "9px 14px", gap: 12 }}>
            <span style={{ ...display, fontSize: 17, fontWeight: 800, color: aWin ? T.accent : T.text, fontVariantNumeric: "tabular-nums", textAlign: "left" }}>{r.a}</span>
            <span style={{ ...ui, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textMute, textAlign: "center", whiteSpace: "nowrap" }}>{r.label} {r.est && <Tag>est</Tag>}</span>
            <span style={{ ...display, fontSize: 17, fontWeight: 800, color: bWin ? T.accent : T.text, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{r.b}</span>
          </div>
        );
      })}
    </div>
  );
}

// --- TAB 2: Matchups (Team / 5-on-5 / 1-on-1) ------------------------------
function MatchupsTab({ teams, allPlayers, pools, store, update }) {
  const [sub, setSub] = useState("team");
  const subs = [["team", "Team"], ["5v5", "5-on-5"], ["1v1", "1-on-1"]];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 2, borderBottom: `1px solid ${T.border}` }}>
        {subs.map(([k, l]) => <button key={k} type="button" onClick={() => setSub(k)} style={{ ...ui, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: sub === k ? T.accent : T.textMute, background: "transparent", border: "none", padding: "9px 14px", borderBottom: `2px solid ${sub === k ? T.accent : "transparent"}`, cursor: "pointer", fontWeight: sub === k ? 700 : 600 }}>{l}</button>)}
      </div>
      {sub === "team" && <TeamCompare teams={teams} store={store} update={update} />}
      {sub === "5v5" && <FiveOnFive teams={teams} />}
      {sub === "1v1" && <OneOnOne allPlayers={allPlayers} pools={pools} store={store} update={update} />}
    </div>
  );
}

function ColumnPicker({ all, on, toggle }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      <span style={lab}>Columns</span>
      {all.map((m) => (
        <button key={m.key} type="button" onClick={() => toggle(m.key)} style={{ ...ui, fontSize: 10.5, letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 700, borderRadius: 999, padding: "4px 10px", cursor: "pointer", color: on.has(m.key) ? T.bg : T.textMute, background: on.has(m.key) ? T.accent : "transparent", border: `1px solid ${on.has(m.key) ? T.accent : T.border}` }}>{m.label}</button>
      ))}
    </div>
  );
}

function TeamCompare({ teams, store, update }) {
  const withData = teams.filter((t) => (t.teamGp || 0) > 0);
  const [aSlug, setA] = useState(withData[0]?.slug || "");
  const [bSlug, setB] = useState(withData[1]?.slug || "");
  const [on, setOn] = useState(new Set(["ppg", "pace", "efg", "ts", "threePArate", "tovRate"]));
  const toggle = (k) => setOn((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const a = teams.find((t) => t.slug === aSlug), b = teams.find((t) => t.slug === bSlug);
  const aPs = a && teamPlaystyle(a.box, a.teamGp), bPs = b && teamPlaystyle(b.box, b.teamGp);
  const rows = aPs && bPs ? TEAM_METRICS.filter((m) => on.has(m.key)).map((m) => {
    const av = aPs[m.key], bv = bPs[m.key];
    const aWin = m.hi === "high" ? av > bv : m.hi === "low" ? av < bv : false;
    const bWin = m.hi === "high" ? bv > av : m.hi === "low" ? bv < av : false;
    return { label: m.label, est: m.est, a: num(av, m.suffix), b: num(bv, m.suffix), aWin, bWin };
  }) : [];
  const read = useMemo(() => {
    if (!aPs || !bPs) return null;
    const bits = [];
    if (Math.abs(aPs.pace - bPs.pace) > 4) bits.push(`${(aPs.pace > bPs.pace ? a : b).name} wants a faster game`);
    if (Math.abs(aPs.ts - bPs.ts) > 4) bits.push(`${(aPs.ts > bPs.ts ? a : b).name} is the more efficient scoring team`);
    if (Math.abs(aPs.tovRate - bPs.tovRate) > 3) bits.push(`${(aPs.tovRate < bPs.tovRate ? a : b).name} takes care of the ball better`);
    return bits.length ? bits.join("; ") + "." : "Two evenly-matched profiles.";
  }, [aPs, bPs, a, b]);
  const save = () => update((p) => ({ ...p, matchups: [...(p.matchups || []), { type: "team", a: a.name, b: b.name, name: `${a.name} vs ${b.name}`, ts: "" }] }));

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <Sel value={aSlug} onChange={(e) => setA(e.target.value)}>{teams.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}</Sel>
        <span style={{ ...display, color: T.textMute }}>vs</span>
        <Sel value={bSlug} onChange={(e) => setB(e.target.value)}>{teams.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}</Sel>
      </div>
      <ColumnPicker all={TEAM_METRICS} on={on} toggle={toggle} />
      {rows.length ? <CompareRows rows={rows} /> : <div style={{ ...ui, fontSize: 12, color: T.textMute }}>Pick two teams with box-score data.</div>}
      {read && <div style={{ ...card }}><span style={lab}>Matchup read</span><div style={{ ...ui, fontSize: 13, color: T.textDim, lineHeight: 1.5, marginTop: 8 }}>{read}</div></div>}
      <button type="button" onClick={save} style={{ ...ui, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, color: T.bg, background: T.accent, border: "none", borderRadius: 6, padding: "8px 14px", cursor: "pointer", justifySelf: "start" }}>Save matchup</button>
    </div>
  );
}

const SLOTS = ["PG", "SG", "SF", "PF", "C"];
function FiveOnFive({ teams }) {
  const empty = () => ({ PG: "", SG: "", SF: "", PF: "", C: "" });
  // Only teams that actually have box-score players are pickable.
  const named = useMemo(() => teams.filter((t) => (t.roster || []).some((p) => (p.gp || 0) > 0 && p.pts != null)), [teams]);
  const [teamA, setTeamA] = useState(named[0]?.name || "");
  const [teamB, setTeamB] = useState(named[1]?.name || named[0]?.name || "");
  const [A5, setA5] = useState(empty());
  const [B5, setB5] = useState(empty());
  const rosterOf = (name) => ((teams.find((t) => t.name === name)?.roster) || []).filter((p) => (p.gp || 0) > 0 && p.pts != null);
  const rosterA = useMemo(() => rosterOf(teamA), [teams, teamA]);
  const rosterB = useMemo(() => rosterOf(teamB), [teams, teamB]);
  const total = (lineup, roster) => {
    const byName = Object.fromEntries(roster.map((p) => [p.name, p]));
    return Object.values(lineup).map((n) => byName[n]).filter(Boolean).reduce((acc, p) => ({ ppg: acc.ppg + (p.pts || 0), rpg: acc.rpg + (p.reb || 0), apg: acc.apg + (p.ast || 0) }), { ppg: 0, rpg: 0, apg: 0 });
  };
  const tA = total(A5, rosterA), tB = total(B5, rosterB);
  const r1 = (n) => Math.round(n * 10) / 10;
  // Players can only be drawn from the lineup's own team — picking a different
  // team resets that lineup so no off-roster name lingers.
  const Lineup = ({ label, teamName, onTeam, roster, side, set }) => (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={lab}>Lineup {label}</div>
        <select style={{ ...inputStyle, maxWidth: 180 }} value={teamName} onChange={(e) => onTeam(e.target.value)}>
          {named.length === 0 && <option value="">No teams</option>}
          {named.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
        </select>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        {SLOTS.map((s) => (
          <div key={s} style={{ display: "grid", gridTemplateColumns: "40px 1fr", gap: 8, alignItems: "center" }}>
            <span style={{ ...ui, fontSize: 11, color: T.textMute, fontWeight: 700 }}>{s}</span>
            <select style={inputStyle} value={side[s]} onChange={(e) => set({ ...side, [s]: e.target.value })}>
              <option value="">— pick from {teamName || "team"} —</option>
              {roster.map((p) => <option key={p.name} value={p.name}>{p.name} · {r1(p.pts || 0)} ppg</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ ...ui, fontSize: 12, color: T.textMute }}>Build a lineup for each team — players are limited to that team's own roster.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        <Lineup label="A" teamName={teamA} onTeam={(v) => { setTeamA(v); setA5(empty()); }} roster={rosterA} side={A5} set={setA5} />
        <Lineup label="B" teamName={teamB} onTeam={(v) => { setTeamB(v); setB5(empty()); }} roster={rosterB} side={B5} set={setB5} />
      </div>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={lab}>Lineup totals</span><Tag>projected</Tag></div>
        <CompareRows rows={[
          { label: "PPG", a: r1(tA.ppg), b: r1(tB.ppg), aWin: tA.ppg > tB.ppg, bWin: tB.ppg > tA.ppg },
          { label: "RPG", a: r1(tA.rpg), b: r1(tB.rpg), aWin: tA.rpg > tB.rpg, bWin: tB.rpg > tA.rpg },
          { label: "APG", a: r1(tA.apg), b: r1(tB.apg), aWin: tA.apg > tB.apg, bWin: tB.apg > tA.apg },
        ]} />
        <div style={{ ...ui, fontSize: 10.5, color: T.textMute, marginTop: 8 }}>Summed individual production — not true 5-man efficiency.</div>
      </div>
      <LockedCard title="True 5-man lineup efficiency / net rating" why="Requires possession-level data for the exact five on the floor. Box scores can't produce it — locked." />
    </div>
  );
}

const P_METRICS = [["pts", "PPG", "ppg"], ["reb", "RPG", "rpg"], ["ast", "APG", "apg"], ["fgPct", "FG%", null], ["tsPct", "TS%", null]];
function OneOnOne({ allPlayers, pools, store, update }) {
  const [aN, setA] = useState(allPlayers[0]?.name || "");
  const [bN, setB] = useState(allPlayers[1]?.name || "");
  const a = allPlayers.find((p) => p.name === aN), b = allPlayers.find((p) => p.name === bN);
  const note = (store.notes || {})[`1v1:${aN}|${bN}`] || "";
  const setNote = (v) => update((p) => ({ ...p, notes: { ...(p.notes || {}), [`1v1:${aN}|${bN}`]: v } }));
  const rows = a && b ? P_METRICS.map(([key, label, pool]) => {
    const av = a[key], bv = b[key];
    return { label, a: av == null ? "—" : (key.includes("Pct") ? `${av}%` : Number(av).toFixed(1)), b: bv == null ? "—" : (key.includes("Pct") ? `${bv}%` : Number(bv).toFixed(1)), aWin: (av ?? -1) > (bv ?? -1), bWin: (bv ?? -1) > (av ?? -1) };
  }) : [];
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <Sel value={aN} onChange={(e) => setA(e.target.value)}>{allPlayers.map((p) => <option key={p.name + p.team} value={p.name}>{p.name} ({p.team})</option>)}</Sel>
        <span style={{ ...display, color: T.textMute }}>vs</span>
        <Sel value={bN} onChange={(e) => setB(e.target.value)}>{allPlayers.map((p) => <option key={p.name + p.team} value={p.name}>{p.name} ({p.team})</option>)}</Sel>
      </div>
      {rows.length > 0 && <CompareRows rows={rows} />}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><span style={lab}>The Battle</span><Tag>Coach</Tag></div>
        <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="How does this matchup play out? assignments, advantages…" />
      </div>
      <div style={{ ...ui, fontSize: 10.5, color: T.textMute }}>Production comparison + projection — not tracked head-to-head.</div>
    </div>
  );
}

// --- TAB 3: Players ---------------------------------------------------------
function PlayersTab({ allPlayers, pools, onOpenProfile, store, update }) {
  const [picks, setPicks] = useState(allPlayers.slice(0, 2).map((p) => p.name));
  const chosen = picks.map((n) => allPlayers.find((p) => p.name === n)).filter(Boolean);
  const add = (n) => { if (n && !picks.includes(n)) setPicks([...picks, n]); };
  const remove = (n) => setPicks(picks.filter((x) => x !== n));
  const bar = (v, max) => Math.max(2, Math.min(100, Math.round(((pctRank(pools[max], v) || 0)))));
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={lab}>Compare</span>
        <Sel value="" onChange={(e) => { add(e.target.value); e.target.value = ""; }}><option value="">+ add player…</option>{allPlayers.map((p) => <option key={p.name + p.team} value={p.name}>{p.name} ({p.team})</option>)}</Sel>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, chosen.length)}, minmax(160px, 1fr))`, gap: 10 }}>
        {chosen.map((p) => {
          const best = (key) => chosen.every((o) => (o[key] ?? -1) <= (p[key] ?? -1)) && (p[key] != null);
          return (
            <div key={p.name} style={card}>
              <button type="button" onClick={() => onOpenProfile?.(p.id)} disabled={!p.id} style={{ ...display, fontSize: 18, fontWeight: 700, color: p.id ? T.signal : T.text, background: "transparent", border: "none", padding: 0, cursor: p.id ? "pointer" : "default", textAlign: "left" }}>{p.name}</button>
              <div style={{ ...ui, fontSize: 10.5, color: T.textMute, marginTop: 2 }}>{[p.pos, p.team].filter(Boolean).join(" · ")}{p.archetype ? ` · ${p.archetype}` : ""}</div>
              <div style={{ display: "grid", gap: 7, marginTop: 12 }}>
                {[["pts", "PPG", "ppg"], ["reb", "RPG", "rpg"], ["ast", "APG", "apg"], ["fgPct", "FG%", null], ["tsPct", "TS%", null]].map(([key, label, pool]) => (
                  <div key={key}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ ...ui, fontSize: 10.5, color: T.textMute }}>{label}</span>
                      <span style={{ ...display, fontSize: 14, fontWeight: 700, color: best(key) ? T.accent : T.text, fontVariantNumeric: "tabular-nums" }}>{p[key] == null ? "—" : (key.includes("Pct") ? `${p[key]}%` : Number(p[key]).toFixed(1))}</span>
                    </div>
                    {pool && p[key] != null && <div style={{ height: 5, background: "var(--prospera-pct-track)", borderRadius: 3, overflow: "hidden", marginTop: 3 }}><div style={{ width: `${bar(p[key], pool)}%`, height: "100%", background: pctRank(pools[pool], p[key]) >= 75 ? T.accent : "#5A646E" }} /></div>}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => remove(p.name)} style={{ ...ui, fontSize: 10, color: T.danger, background: "transparent", border: "none", cursor: "pointer", marginTop: 10, padding: 0 }}>remove</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- TAB 4: My Team ---------------------------------------------------------
function MyTeamTab({ teams }) {
  const withData = teams.filter((t) => (t.teamGp || 0) > 0);
  const [slug, setSlug] = useState(withData[0]?.slug || "");
  const t = teams.find((x) => x.slug === slug);
  const ps = t && teamPlaystyle(t.box, t.teamGp);
  const roster = (t?.roster || []).filter((p) => (p.gp || 0) > 0 && p.tsPct != null);
  const byTs = [...roster].sort((a, b) => (b.tsPct ?? -1) - (a.tsPct ?? -1));
  const leaders = byTs.slice(0, 3), laggards = byTs.slice(-3).reverse();
  const strengths = [], weaknesses = [];
  if (ps) {
    if (ps.ts >= 55) strengths.push(`Efficient scoring team (${ps.ts}% TS est)`);
    if (ps.astRate >= 55) strengths.push(`Shares the ball (${ps.astRate}% of FGM assisted)`);
    if (ps.orebRate >= 35) strengths.push(`Strong on the offensive glass (${ps.orebRate}% est)`);
    if (ps.tovRate >= 18) weaknesses.push(`Turnover-prone (${ps.tovRate}% per poss est)`);
    if (ps.ts < 48) weaknesses.push(`Below-average scoring efficiency (${ps.ts}% TS est)`);
    if (ps.threePArate < 25) weaknesses.push(`Low 3-point volume (${ps.threePArate}% of FGA)`);
  }
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Sel value={slug} onChange={(e) => setSlug(e.target.value)}>{withData.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}</Sel>
      <PlaystyleColumn ps={ps} share={t && topScorerShare(t.roster)} label={`${t?.name || "—"} — our playstyle`} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <div style={card}><span style={lab}>Most efficient (TS%)</span><div style={{ display: "grid", gap: 5, marginTop: 10 }}>{leaders.map((p) => <span key={p.name} style={{ ...ui, fontSize: 12, color: T.textDim }}><b style={{ color: T.text }}>{p.name}</b> <span style={{ color: T.accent, fontWeight: 700 }}>{p.tsPct}%</span></span>)}</div></div>
        <div style={card}><span style={lab}>Least efficient (TS%)</span><div style={{ display: "grid", gap: 5, marginTop: 10 }}>{laggards.map((p) => <span key={p.name} style={{ ...ui, fontSize: 12, color: T.textMute }}>{p.name} · {p.tsPct}%</span>)}</div></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <div style={card}><span style={{ ...lab, color: T.positive }}>Strengths</span><div style={{ display: "grid", gap: 6, marginTop: 10 }}>{strengths.length ? strengths.map((s, i) => <span key={i} style={{ ...ui, fontSize: 12, color: T.textDim }}>• {s}</span>) : <span style={{ ...ui, fontSize: 12, color: T.textMute }}>—</span>}</div></div>
        <div style={card}><span style={{ ...lab, color: T.warn }}>Watch areas</span><div style={{ display: "grid", gap: 6, marginTop: 10 }}>{weaknesses.length ? weaknesses.map((s, i) => <span key={i} style={{ ...ui, fontSize: 12, color: T.textDim }}>• {s}</span>) : <span style={{ ...ui, fontSize: 12, color: T.textMute }}>—</span>}</div></div>
      </div>
    </div>
  );
}

// --- TAB 5: Lists & Notes ---------------------------------------------------
function ListsNotesTab({ allPlayers, store, update, onOpenProfile }) {
  const lists = store.lists || [];
  const [active, setActive] = useState(0);
  const list = lists[active];
  const setLists = (next) => update((p) => ({ ...p, lists: next }));
  const newList = () => { const next = [...lists, { name: `List ${lists.length + 1}`, items: [] }]; setLists(next); setActive(next.length - 1); };
  const addItem = (name) => { if (!name || !list) return; const next = lists.map((l, i) => i === active ? { ...l, items: [...l.items, { name, tag: "", note: "" }] } : l); setLists(next); };
  const setItem = (i, patch) => setLists(lists.map((l, j) => j === active ? { ...l, items: l.items.map((it, k) => k === i ? { ...it, ...patch } : it) } : l));
  const cf = store.customFields || [];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}>
      <div>
        <button type="button" onClick={newList} style={{ ...ui, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, color: T.bg, background: T.accent, border: "none", borderRadius: 6, padding: "8px 12px", cursor: "pointer", width: "100%", marginBottom: 10 }}>+ New list</button>
        <div style={{ display: "grid", gap: 4 }}>
          {lists.map((l, i) => <button key={i} type="button" onClick={() => setActive(i)} style={{ ...ui, fontSize: 12, textAlign: "left", padding: "8px 10px", borderRadius: 6, cursor: "pointer", color: i === active ? T.text : T.textDim, background: i === active ? "var(--prospera-accent-bg-faint)" : "transparent", border: `1px solid ${i === active ? T.accent : T.border}` }}>{l.name} <span style={{ color: T.textMute }}>· {l.items.length}</span></button>)}
          {!lists.length && <span style={{ ...ui, fontSize: 12, color: T.textMute }}>No lists yet.</span>}
        </div>
        {cf.length > 0 && <div style={{ marginTop: 16 }}><span style={lab}>Custom fields</span>{cf.map((f, i) => <div key={i} style={{ ...ui, fontSize: 11, color: T.textMute, marginTop: 4 }}>{f.label}</div>)}</div>}
        <button type="button" onClick={() => { const label = "Field"; update((p) => ({ ...p, customFields: [...(p.customFields || []), { label }] })); }} style={{ ...ui, fontSize: 10.5, color: T.signal, background: "transparent", border: `1px dashed ${T.border}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer", marginTop: 8 }}>+ Custom field</button>
      </div>
      <div>
        {list ? (
          <div style={{ display: "grid", gap: 10 }}>
            <input style={{ ...inputStyle, ...display, fontSize: 18, fontWeight: 700, maxWidth: 360 }} value={list.name} onChange={(e) => setLists(lists.map((l, i) => i === active ? { ...l, name: e.target.value } : l))} />
            <Sel value="" onChange={(e) => { addItem(e.target.value); e.target.value = ""; }}><option value="">+ add player…</option>{allPlayers.map((p) => <option key={p.name + p.team} value={p.name}>{p.name} ({p.team})</option>)}</Sel>
            <div style={{ display: "grid", gap: 6 }}>
              {list.items.map((it, i) => {
                const pl = allPlayers.find((p) => p.name === it.name);
                return (
                  <div key={i} style={{ ...card, display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", padding: "10px 14px" }}>
                    <div>
                      <button type="button" onClick={() => onOpenProfile?.(pl?.id)} disabled={!pl?.id} style={{ ...display, fontSize: 15, fontWeight: 700, color: pl?.id ? T.signal : T.text, background: "transparent", border: "none", padding: 0, cursor: pl?.id ? "pointer" : "default" }}>{it.name}</button>
                      <span style={{ ...ui, fontSize: 10.5, color: T.textMute, marginLeft: 8 }}>{pl?.archetype || pl?.pos || ""}</span>
                      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                        <input style={{ ...inputStyle, fontSize: 10.5, maxWidth: 120 }} value={it.tag} onChange={(e) => setItem(i, { tag: e.target.value })} placeholder="tag" />
                        <input style={{ ...inputStyle, fontSize: 11, flex: 1, minWidth: 140 }} value={it.note} onChange={(e) => setItem(i, { note: e.target.value })} placeholder="note…" />
                      </div>
                    </div>
                    <button type="button" onClick={() => setItem(i, null) || setLists(lists.map((l, j) => j === active ? { ...l, items: l.items.filter((_, k) => k !== i) } : l))} style={{ ...ui, fontSize: 11, color: T.danger, background: "transparent", border: "none", cursor: "pointer" }}>×</button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : <div style={{ ...ui, fontSize: 13, color: T.textMute }}>Create a list to start tracking players with tags + notes.</div>}
      </div>
    </div>
  );
}

// --- Scout HQ shell ---------------------------------------------------------
// Locked landing shown to base users. Explains the coach tier, previews what's
// inside, and takes a pilot/owner access code. Players/fans don't get the tools.
function CoachGate({ onRedeem }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const submit = (e) => {
    e.preventDefault();
    const ok = onRedeem(code);
    setErr(ok ? "" : "That code isn't valid. Pilot codes come from Prospera directly.");
  };
  const features = [
    ["Opponent scouting", "Computed playstyle + your own scouting notes on any opponent."],
    ["Matchup builders", "Team vs team, custom 5-on-5 lineups, and 1-on-1 reads."],
    ["My team", "Efficiency leaders, tendencies, and auto strengths/watch-areas."],
    ["Lists & notes", "Private boards, tags, and game-prep notes that persist."],
  ];
  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 720, margin: "0 auto" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={{ ...display, fontSize: 30, fontWeight: 800, textTransform: "uppercase", color: T.text, margin: 0 }}>Scout HQ</h1>
          <Tag color={T.accent}>Coach tier</Tag><Tag color={T.warn}>🔒 Locked</Tag>
        </div>
        <div style={{ ...ui, fontSize: 13.5, color: T.textDim, lineHeight: 1.6, marginTop: 8 }}>
          Scout HQ is the <b style={{ color: T.text }}>coach tier</b> — opponent scouting, matchup builders, and private
          notes. It's <b style={{ color: T.text }}>free for pilot programs</b>; otherwise it's part of a coach subscription.
          Base profiles, stats, team pages, and leaderboards stay free for everyone.
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        {features.map(([h, d]) => (
          <div key={h} style={{ ...card, opacity: 0.92 }}>
            <div style={{ ...lab, color: T.textDim }}>{h}</div>
            <div style={{ ...ui, fontSize: 12, color: T.textMute, lineHeight: 1.5, marginTop: 6 }}>{d}</div>
          </div>
        ))}
      </div>
      <form onSubmit={submit} style={{ ...card, display: "grid", gap: 10 }}>
        <div style={{ ...lab, color: T.accent }}>Have a pilot access code?</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={code} onChange={(e) => { setCode(e.target.value); setErr(""); }} placeholder="e.g. HAYFIELD-PILOT"
            style={{ ...inputStyle, flex: "1 1 200px", maxWidth: 320, textTransform: "uppercase" }} />
          <button type="submit" style={{ ...ui, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, color: T.bg, background: T.accent, border: "none", borderRadius: 6, padding: "0 18px", cursor: "pointer", minHeight: 40 }}>Unlock</button>
        </div>
        {err && <div style={{ ...ui, fontSize: 12, color: T.danger }}>{err}</div>}
        <div style={{ ...ui, fontSize: 11.5, color: T.textMute, lineHeight: 1.5 }}>
          Coaching a DMV program and want in? <a href="mailto:hello@prosperahoops.com?subject=Scout%20HQ%20pilot%20access" style={{ color: T.signal, textDecoration: "none" }}>Request pilot access →</a>
        </div>
      </form>
    </div>
  );
}

// Thin bar atop the unlocked tier showing who's in + a way out. Hidden for admins
// (the owner is always in and has no pass to drop).
function CoachAccessBar({ pass, onSignOut }) {
  if (!pass) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", background: "var(--prospera-accent-bg-faint)", border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px" }}>
      <span style={{ ...ui, fontSize: 11.5, color: T.textDim }}>
        Coach access: <b style={{ color: T.text }}>{pass.label || pass.tier}</b>
        {pass.tier === "pilot" && <> <Tag color={T.positive}>Pilot · free</Tag></>}
      </span>
      <button type="button" onClick={onSignOut} style={{ ...ui, fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textMute, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 10px", cursor: "pointer" }}>Sign out of coach</button>
    </div>
  );
}

export default function ScoutHQ({ teams = [], onOpenProfile }) {
  const { isAdmin } = useAuth();
  const { pass, redeem, clear } = useCoachAccess();
  const access = isAdmin || !!pass;
  const [tab, setTab] = useState("opponents");
  const [store, update] = useHQStore();
  const allPlayers = useMemo(() => {
    const map = new Map(); // dedupe by name (keeps the higher-scoring entry) — unique keys + unambiguous lookup
    for (const t of teams) for (const p of (t.roster || [])) {
      if (!((p.gp || 0) > 0 && p.pts != null)) continue;
      const ex = map.get(p.name);
      if (!ex || (p.pts || 0) > (ex.pts || 0)) map.set(p.name, { ...p, team: t.name });
    }
    return [...map.values()].sort((a, b) => b.pts - a.pts);
  }, [teams]);
  const pools = useMemo(() => {
    const mk = (key) => allPlayers.map((p) => p[key]).filter((v) => v != null).sort((a, b) => a - b);
    return { ppg: mk("pts"), rpg: mk("reb"), apg: mk("ast") };
  }, [allPlayers]);

  // Gate: base users get the locked landing, not the tools. (All hooks above run
  // first so this early return never violates the rules of hooks.)
  if (!access) return <CoachGate onRedeem={redeem} />;

  const TABS = [["opponents", "Opponents"], ["matchups", "Matchups"], ["players", "Players"], ["myteam", "My Team"], ["lists", "Lists & Notes"]];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <CoachAccessBar pass={pass} onSignOut={clear} />
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={{ ...display, fontSize: 30, fontWeight: 800, textTransform: "uppercase", color: T.text, margin: 0 }}>Scout HQ</h1>
          <Tag color={T.accent}>Coach</Tag>
        </div>
        <div style={{ ...ui, fontSize: 12, color: T.textMute, marginTop: 4 }}>Box-score analytics + scouting tools. Estimated metrics are tagged <Tag>est</Tag>; tracked-possession metrics are <Tag color={T.warn}>locked</Tag>.</div>
      </div>
      <div style={{ display: "flex", gap: 2, borderBottom: `1px solid ${T.border}`, overflowX: "auto" }}>
        {TABS.map(([k, l]) => <button key={k} type="button" onClick={() => setTab(k)} style={{ ...ui, fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", color: tab === k ? T.accent : T.textDim, background: "transparent", border: "none", padding: "12px 16px", borderBottom: `2px solid ${tab === k ? T.accent : "transparent"}`, cursor: "pointer", fontWeight: tab === k ? 700 : 600, whiteSpace: "nowrap" }}>{l}</button>)}
      </div>
      {tab === "opponents" && <OpponentsTab teams={teams} store={store} update={update} />}
      {tab === "matchups" && <MatchupsTab teams={teams} allPlayers={allPlayers} pools={pools} store={store} update={update} />}
      {tab === "players" && <PlayersTab allPlayers={allPlayers} pools={pools} onOpenProfile={onOpenProfile} store={store} update={update} />}
      {tab === "myteam" && <MyTeamTab teams={teams} />}
      {tab === "lists" && <ListsNotesTab allPlayers={allPlayers} store={store} update={update} onOpenProfile={onOpenProfile} />}
    </div>
  );
}
