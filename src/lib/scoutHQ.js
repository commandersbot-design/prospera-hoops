// Scout HQ — box-score derivations (all labeled "est") + localStorage persistence.
// Nothing here uses tracked possessions; everything is estimated from box scores.
import { useState, useCallback } from "react";

const r1 = (n) => (isFinite(n) ? Math.round(n * 10) / 10 : 0);
const pct1 = (n) => (isFinite(n) ? Math.round(n * 1000) / 10 : 0);
const safe = (a, b) => (b > 0 ? a / b : 0);

// Team playstyle from summed box totals + games played. Possessions ≈
// FGA − OREB + TOV + 0.44·FTA. All values are ESTIMATES (box-score-derived).
export function teamPlaystyle(box, gp) {
  if (!box || !gp) return null;
  const poss = box.fga - box.oreb + box.to + 0.44 * box.fta;
  const from2 = 2 * (box.fgm - box.tpm), from3 = 3 * box.tpm, fromFt = box.ftm;
  const ptsTot = from2 + from3 + fromFt || 1;
  return {
    gp,
    ppg: r1(box.pts / gp),
    pace: r1(poss / gp),                          // possessions / game
    threePArate: pct1(safe(box.tpa, box.fga)),    // % of FGA from three
    ftRate: pct1(safe(box.fta, box.fga)),         // FTA per FGA
    astRate: pct1(safe(box.ast, box.fgm)),        // % of FGM assisted
    tovRate: pct1(safe(box.to, poss)),            // TOV per possession
    orebRate: pct1(safe(box.oreb, box.fga - box.fgm)), // OREB per missed FG
    efg: pct1(safe(box.fgm + 0.5 * box.tpm, box.fga)),
    ts: pct1(safe(box.pts, 2 * (box.fga + 0.44 * box.fta))),
    mix: { two: Math.round((from2 / ptsTot) * 100), three: Math.round((from3 / ptsTot) * 100), ft: Math.round((fromFt / ptsTot) * 100) },
  };
}

// Top-scorer concentration: leader PPG ÷ team PPG (how reliant on one guy).
export function topScorerShare(roster) {
  const scorers = (roster || []).filter((p) => p.pts != null && (p.gp || 0) > 0);
  if (!scorers.length) return null;
  const teamPpg = scorers.reduce((s, p) => s + (p.pts || 0), 0);
  const lead = scorers.reduce((b, p) => ((p.pts ?? -1) > (b?.pts ?? -1) ? p : b), null);
  return teamPpg > 0 ? { player: lead.name, pct: Math.round((lead.pts / teamPpg) * 100) } : null;
}

// Percentile rank of v within a sorted-ascending array (1..99).
export function pctRank(arr, v) {
  if (!arr || !arr.length || v == null) return null;
  let c = 0; for (const x of arr) { if (x <= v) c++; else break; }
  return Math.max(1, Math.min(99, Math.round((c / arr.length) * 100)));
}

// --- persistence (localStorage) --------------------------------------------
const KEY = "prospera.scoutHQ.v1";
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const write = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* ignore */ } };

// Hook: returns [data, update]. data holds { lists, notes, matchups, customFields, opponentInput }.
export function useHQStore() {
  const [data, setData] = useState(read);
  const update = useCallback((fn) => setData((prev) => { const next = fn({ ...prev }); write(next); return next; }), []);
  return [data, update];
}
