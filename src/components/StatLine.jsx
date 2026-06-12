// "By the Numbers" — the v1 deep stat line, computed from a player's game logs.
// Honest by construction: shows shooting splits + eFG%/TS%, AST:TO, TOV%, and
// scoring mix from box-score totals; per-36 + MPG appear only when minutes were
// recorded (so a no-minutes book doesn't fake a rate). See metrics-blueprint.md.
import React from "react";
import { T, ui, display } from "../lib/theme.js";
import { playerHighlights } from "../lib/highlights.js";

const shortOpp = (o) => String(o || "").replace(/\s*\([^)]*\)\s*/g, "").trim().slice(0, 18) || "—";

const r1 = (n) => (isFinite(n) ? Math.round(n * 10) / 10 : 0);
const pct = (m, a) => (a > 0 ? `${r1((m / a) * 100)}%` : "—");

export function seasonStatLine(games) {
  if (!games || !games.length) return null;
  const s = games.reduce((a, g) => {
    for (const k of ["pts", "reb", "oreb", "dreb", "ast", "stl", "blk", "to", "pf", "min", "fgm", "fga", "tpm", "tpa", "ftm", "fta"]) a[k] += g[k] || 0;
    return a;
  }, { pts: 0, reb: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0, min: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0 });
  const gp = games.length;
  const hasMin = s.min > 0;
  const tsDen = 2 * (s.fga + 0.44 * s.fta);
  const ptsFrom2 = 2 * (s.fgm - s.tpm), ptsFrom3 = 3 * s.tpm, ptsFromFt = s.ftm;
  const ptsTot = ptsFrom2 + ptsFrom3 + ptsFromFt || 1;
  return {
    gp, hasMin, totals: s,
    per: { ppg: r1(s.pts / gp), rpg: r1(s.reb / gp), apg: r1(s.ast / gp), spg: r1(s.stl / gp), bpg: r1(s.blk / gp), topg: r1(s.to / gp), mpg: hasMin ? r1(s.min / gp) : null },
    shoot: {
      fg: `${s.fgm}-${s.fga}`, fgPct: pct(s.fgm, s.fga),
      tp: `${s.tpm}-${s.tpa}`, tpPct: pct(s.tpm, s.tpa),
      ft: `${s.ftm}-${s.fta}`, ftPct: pct(s.ftm, s.fta),
      efg: s.fga > 0 ? `${r1(((s.fgm + 0.5 * s.tpm) / s.fga) * 100)}%` : "—",
      ts: tsDen > 0 ? `${r1((s.pts / tsDen) * 100)}%` : "—",
    },
    role: {
      ato: s.to > 0 ? `${r1(s.ast / s.to)}` : (s.ast > 0 ? "∞" : "—"),
      tovPct: (s.fga + 0.44 * s.fta + s.to) > 0 ? pct(s.to, s.fga + 0.44 * s.fta + s.to) : "—",
      mix2: Math.round((ptsFrom2 / ptsTot) * 100), mix3: Math.round((ptsFrom3 / ptsTot) * 100), mixFt: Math.round((ptsFromFt / ptsTot) * 100),
    },
    per36: hasMin ? { pts: r1((s.pts * 36) / s.min), reb: r1((s.reb * 36) / s.min), ast: r1((s.ast * 36) / s.min) } : null,
  };
}

const Cell = ({ label, value, accent }) => (
  <div style={{ display: "grid", gap: 3, minWidth: 56 }}>
    <span style={{ ...ui, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textMute }}>{label}</span>
    <span style={{ ...display, fontSize: 22, fontWeight: 700, color: accent ? T.accent : T.text, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{value}</span>
  </div>
);

const Group = ({ title, children, note }) => (
  <div style={{ display: "grid", gap: 10 }}>
    <span style={{ ...ui, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, color: T.textDim }}>
      {title}{note && <span style={{ color: T.textMute, fontWeight: 400, letterSpacing: "0.04em" }}> · {note}</span>}
    </span>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "14px 22px" }}>{children}</div>
  </div>
);

const HighCell = ({ label, h }) => (
  <div style={{ display: "grid", gap: 3, minWidth: 56 }}>
    <span style={{ ...ui, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textMute }}>{label} high</span>
    <span style={{ ...display, fontSize: 22, fontWeight: 700, color: T.accent, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{h.v}</span>
    {h.opp && <span style={{ ...ui, fontSize: 9, color: T.textMute }}>vs {shortOpp(h.opp)}</span>}
  </div>
);

export default function StatLine({ games }) {
  const d = seasonStatLine(games);
  if (!d) return null;
  const h = playerHighlights(games);
  const notable = h ? [
    h.g30 > 0 && `${h.g30}× 30-pt game${h.g30 > 1 ? "s" : ""}`,
    h.g30 === 0 && h.g20 > 0 && `${h.g20}× 20-pt game${h.g20 > 1 ? "s" : ""}`,
    h.td > 0 && `${h.td} triple-double${h.td > 1 ? "s" : ""}`,
    h.dd > 0 && `${h.dd} double-double${h.dd > 1 ? "s" : ""}`,
  ].filter(Boolean) : [];
  return (
    <section style={{ background: T.surface, border: `1px solid ${T.border}`, padding: 18, display: "grid", gap: 18 }}>
      <div style={{ ...ui, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700, color: T.accent }}>
        By the Numbers <span style={{ color: T.textMute, fontWeight: 400 }}>· {d.gp} GP · from box scores</span>
      </div>

      <Group title="Season averages">
        <Cell label="PPG" value={d.per.ppg} accent />
        <Cell label="RPG" value={d.per.rpg} />
        <Cell label="APG" value={d.per.apg} />
        <Cell label="SPG" value={d.per.spg} />
        <Cell label="BPG" value={d.per.bpg} />
        <Cell label="TOPG" value={d.per.topg} />
        {d.per.mpg != null && <Cell label="MPG" value={d.per.mpg} />}
      </Group>

      <Group title="Shooting">
        <Cell label="FG" value={d.shoot.fg} /><Cell label="FG%" value={d.shoot.fgPct} />
        <Cell label="3PT" value={d.shoot.tp} /><Cell label="3P%" value={d.shoot.tpPct} />
        <Cell label="FT" value={d.shoot.ft} /><Cell label="FT%" value={d.shoot.ftPct} />
        <Cell label="eFG%" value={d.shoot.efg} accent /><Cell label="TS%" value={d.shoot.ts} accent />
      </Group>

      <Group title={d.per36 ? "Per-36 & role" : "Role & efficiency"} note={d.per36 ? null : "add minutes to unlock per-36"}>
        {d.per36 && <><Cell label="P36 PTS" value={d.per36.pts} /><Cell label="P36 REB" value={d.per36.reb} /><Cell label="P36 AST" value={d.per36.ast} /></>}
        <Cell label="AST:TO" value={d.role.ato} accent />
        <Cell label="TOV%" value={d.role.tovPct} />
        <Cell label="PTS MIX" value={`${d.role.mix2}/${d.role.mix3}/${d.role.mixFt}`} />
      </Group>
      {h && (
        <Group title="Season highs" note={notable.length ? notable.join(" · ") : null}>
          {h.highs.pts && <HighCell label="PTS" h={h.highs.pts} />}
          {h.highs.reb && <HighCell label="REB" h={h.highs.reb} />}
          {h.highs.ast && <HighCell label="AST" h={h.highs.ast} />}
          {h.highs.tpm && h.highs.tpm.v > 0 && <HighCell label="3PM" h={h.highs.tpm} />}
        </Group>
      )}

      <div style={{ ...ui, fontSize: 10, color: T.textMute, letterSpacing: "0.02em" }}>
        PTS MIX = share of points from 2s / 3s / free throws. eFG% and TS% weight 3-pointers and free throws.
      </div>
    </section>
  );
}
