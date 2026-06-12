// In-app port of the LOCKED archetype classifier (see docs/metrics-blueprint.md).
// Builds the cohort from the live game logs (players with >=3 GP), computes
// percentile ranks within that cohort, and assigns a descriptive, honest tag.
// Percentile-calibrated, so it self-adjusts as more teams ingest. Never a ranking.

const nameKey = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const GUARD = new Set(["PG", "SG", "G", "CG", "PG/SG", "PG/G", "GUARD"]);
const WING = new Set(["W", "SF", "WING", "G/F", "G/W", "SG/SF", "WF", "W/F", "GF"]);
const BIG = new Set(["C", "PF", "F", "F/C", "SF/PF", "FORWARD", "FF", "FC"]);
function bucket(pos) {
  const s = String(pos || "").toUpperCase().replace(/\s/g, "");
  if (GUARD.has(s)) return "Guard";
  if (WING.has(s)) return "Wing";
  if (BIG.has(s)) return "Big";
  return "?";
}

const MIN_GP = 3;
const METRICS = ["ppg", "ts", "tpar", "ftr", "tp3", "ato", "apg", "rpg", "bpg", "orebShare", "stocks", "load"];

// Competition contexts, by evaluative weight (HS = the real season, weighted most;
// summer league = exhibition, lightest). Used to order/scope a player's stats so
// HS / Summer / AAU never blend.
export const LEVEL_WEIGHT = { HS: 3, AAU: 2, Summer: 1 };
export const LEVEL_LABEL = { HS: "High School", AAU: "AAU / Circuit", Summer: "Summer League" };
export const LEVEL_NOTE = { HS: "school season — weighted most", AAU: "travel circuit", Summer: "exhibition — lighter weight" };
const levelOf = (g) => g.level || "Summer";
export function primaryLevel(levels) { return [...levels].sort((a, b) => (LEVEL_WEIGHT[b] || 0) - (LEVEL_WEIGHT[a] || 0))[0] || null; }

function metricsFromGames(games) {
  if (!games || games.length < MIN_GP) return null;
  const s = games.reduce((a, g) => {
    for (const k of ["pts", "fga", "fta", "tpa", "tpm", "ftm", "ast", "to", "oreb", "dreb", "reb", "stl", "blk"]) a[k] += g[k] || 0;
    return a;
  }, { pts: 0, fga: 0, fta: 0, tpa: 0, tpm: 0, ftm: 0, ast: 0, to: 0, oreb: 0, dreb: 0, reb: 0, stl: 0, blk: 0 });
  const gp = games.length;
  return {
    gp,
    ppg: s.pts / gp,
    ts: (s.fga + 0.44 * s.fta) > 0 ? s.pts / (2 * (s.fga + 0.44 * s.fta)) : 0,
    tpar: s.fga > 0 ? s.tpa / s.fga : 0,
    ftr: s.fga > 0 ? s.fta / s.fga : 0,
    tp3: s.tpa >= 5 ? s.tpm / s.tpa : null, // 3P% only at volume
    ato: s.to > 0 ? s.ast / s.to : (s.ast > 0 ? 5 : 0),
    apg: s.ast / gp, rpg: s.reb / gp, bpg: s.blk / gp,
    orebShare: (s.oreb + s.dreb) > 0 ? s.oreb / (s.oreb + s.dreb) : 0,
    stocks: (s.stl + s.blk) / gp,
    load: (s.fga + 0.44 * s.fta + s.to) / gp,
  };
}

// Build the cohort from gameLogs (keyed by nameKey) + CH teams (for position).
// Metrics + percentile arrays are bucketed BY LEVEL, so a summer line is ranked
// against summer players and an HS line against HS players — never blended.
export function buildArchetypeCohort(gameLogs, teams) {
  const posByKey = {};
  for (const t of Object.values(teams || {})) for (const p of (t.players || [])) {
    const k = nameKey(p.name);
    if (!(k in posByKey)) posByKey[k] = bucket(p.position);
  }
  const rowsByKeyLevel = {}; // key -> level -> metrics
  const arraysByLevel = {};  // level -> metric -> sorted values
  for (const [k, e] of Object.entries(gameLogs || {})) {
    const groups = {};
    for (const g of ((e && e.games) || [])) (groups[levelOf(g)] ||= []).push(g);
    for (const [level, gs] of Object.entries(groups)) {
      const m = metricsFromGames(gs);
      if (!m) continue;
      m.pos = posByKey[k] || "?";
      (rowsByKeyLevel[k] ||= {})[level] = m;
      const arr = (arraysByLevel[level] ||= Object.fromEntries(METRICS.map((x) => [x, []])));
      for (const metric of METRICS) { const v = m[metric]; if (v != null && isFinite(v)) arr[metric].push(v); }
    }
  }
  for (const lv of Object.keys(arraysByLevel)) for (const m of METRICS) arraysByLevel[lv][m].sort((a, b) => a - b);
  return { rowsByKeyLevel, arraysByLevel, posByKey, levels: Object.keys(arraysByLevel) };
}

function pctile(arr, v) {
  if (v == null || !isFinite(v) || !arr || !arr.length) return null;
  let lo = 0, hi = arr.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] <= v) lo = mid + 1; else hi = mid; }
  return lo / arr.length;
}

// Ordered rules — first match wins. Mirrors the locked spec exactly.
function classify(r, P, pos) {
  const pp = P("ppg"), pl = P("load"), pa = P("apg"), pao = P("ato"), pt = P("tpar"),
    p3 = P("tp3"), pf = P("ftr"), pr = P("rpg"), pb = P("bpg"), po = P("orebShare"),
    ps = P("stocks"), pts_ = P("ts");
  const big = pos === "Big", perim = pos === "Guard" || pos === "Wing";
  const why = (...x) => x.filter(Boolean).join(" · ");

  if (pa >= .90 && pa > pp) return ["Lead Playmaker", why(`${r.apg.toFixed(1)} apg`, "pass-first")];
  if (pp >= .85 && pa >= .78 && pl >= .80) return ["Primary Shot Creator", why(`${r.ppg.toFixed(1)} ppg`, "high usage", `${r.apg.toFixed(1)} apg`)];
  if (pa >= .82 && pao >= .55) return ["Lead Playmaker", why(`${r.apg.toFixed(1)} apg`, `${r.ato.toFixed(1)} AST:TO`)];
  if (pp >= .80 && pl >= .75) return ["Primary Scorer", why(`${r.ppg.toFixed(1)} ppg`, "high-volume scoring")];
  if (pt >= .70 && p3 != null && p3 >= .65 && pl >= .55) return ["Sharpshooter", why(`${(r.tp3 * 100).toFixed(0)}% 3P on volume`)];
  if (perim && pt >= .60 && p3 != null && p3 >= .45 && ps >= .60) return ["3&D Wing", why("3-point volume", `${r.stocks.toFixed(1)} stocks`)];
  if (big && pt >= .55) return ["Stretch Big", why("spaces the floor", `${r.tpar.toFixed(2)} 3PA rate`)];
  if (big && pb >= .85) return ["Defensive Anchor", why(`${r.bpg.toFixed(1)} bpg`)];
  if (big && pr >= .70 && po >= .50 && pt < .45) return ["Rebounding Big", why(`${r.rpg.toFixed(1)} rpg`, "offensive glass")];
  if (pr >= .85) return ["Glass Cleaner", why(`${r.rpg.toFixed(1)} rpg`)];
  if (pf >= .80 && pt < .45 && pp >= .50) return ["Slasher / Foul-Drawer", why(`${r.ftr.toFixed(2)} FT rate`, "gets to the line")];
  if (pt >= .80 && p3 != null && p3 >= .50 && pl < .55) return ["Floor Spacer", why("low-usage spacer", `${(r.tp3 * 100).toFixed(0)}% 3P`)];
  if (perim && pp >= .55 && ps >= .62) return ["Two-Way Wing", why("scores", `${r.stocks.toFixed(1)} stocks`)];
  if (pl <= .40 && (pao >= .50 || pts_ >= .55)) return ["Low-Usage Glue", why("efficient role", "low turnovers")];
  if (pp <= .25 && pl <= .30) return [null, "limited role / small sample"];
  return ["Rotation Contributor", "balanced role"];
}

// Resolve a player's archetype for a given competition level (default: their
// highest-weight level — HS over AAU over Summer). Percentiles are vs that level's
// cohort. Returns { label, why, gp, earlyRead, level, percentiles } or null.
export function archetypeForPlayer(name, cohort, position, level) {
  if (!cohort) return null;
  const byLevel = cohort.rowsByKeyLevel[nameKey(name)];
  if (!byLevel) return null;
  const lv = level && byLevel[level] ? level : primaryLevel(Object.keys(byLevel));
  const r = byLevel[lv];
  if (!r) return null;
  const pos = bucket(position) !== "?" ? bucket(position) : (r.pos || "?");
  const arrays = cohort.arraysByLevel[lv] || {};
  const P = (m) => pctile(arrays[m], r[m]);
  const [label, why] = classify(r, P, pos);
  return {
    label, why, gp: r.gp, earlyRead: r.gp < 5, level: lv,
    percentiles: {
      scoring: P("ppg"), efficiency: P("ts"), playmaking: P("apg"),
      rebounding: P("rpg"), shooting: P("tpar"), stocks: P("stocks"),
    },
  };
}
