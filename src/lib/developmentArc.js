/**
 * Development Arc — the longitudinal model + derived calcs.
 *
 * This is a SEPARABLE layer (the "multi-season depth"): a pure builder that
 * takes a player's raw per-season rows (scraped into gameLogs.json `.seasons`)
 * plus the prospect record, and emits per-season SNAPSHOTS with honest derived
 * efficiency/rate metrics. The always-free current-season snapshot does NOT
 * depend on this; gate the whole arc behind ARC_TIER later via isArcUnlocked().
 *
 * Honesty rules baked in:
 *  - Efficiency/rate metrics are the hero; raw totals are secondary.
 *  - per-36 / usage need minutes — if a season has no minutes, those fields are
 *    null (rendered "unavailable"), never faked.
 *  - true usage% needs team-possession data we don't have → usagePct is null;
 *    we expose an honest per-game "usage load" (poss used/game) instead.
 *  - eval (composite + 9 axes) is a NULLABLE stub — populated later.
 *  - seasons under MIN_GP are flagged smallSample (de-emphasized, never a peer).
 */

export const MIN_GP = 5;              // below this, a season is "small sample"
export const ARC_TIER_ENABLED = false; // flip to gate the arc as a premium tier
export function isArcUnlocked(/* user */) { return !ARC_TIER_ENABLED; } // free for now

const r1 = (n) => (n == null || Number.isNaN(n) ? null : Math.round(n * 10) / 10);
const pct1 = (n) => (n == null || Number.isNaN(n) ? null : Math.round(n * 1000) / 10);

// HS grade the player was rising INTO the fall after a given summer.
function gradeLevel(gradYear, seasonYear) {
  if (!gradYear || !seasonYear) return null;
  const out = gradYear - seasonYear; // seasons before graduation
  return { 1: "Rising SR", 2: "Rising JR", 3: "Rising SO", 4: "Rising FR" }[out] || (out <= 0 ? "Grad" : `${gradYear} class`);
}

// Transparent role read from the player's own possession load (poss used/game).
// NOT a team-normalized usage% (we lack team data) — labeled as "usage load".
function roleFromLoad(loadPerGame) {
  if (loadPerGame == null) return { tag: "—", load: null };
  if (loadPerGame >= 18) return { tag: "focal point", load: loadPerGame };
  if (loadPerGame >= 13) return { tag: "primary", load: loadPerGame };
  if (loadPerGame >= 8) return { tag: "secondary", load: loadPerGame };
  return { tag: "off-ball", load: loadPerGame };
}

// One raw season row → a snapshot with derived metrics.
function snapshot(s, prospect) {
  const g = s.g || 0;
  const min = s.min || 0;
  const hasMin = min > 0;
  const tsDen = 2 * ((s.fga || 0) + 0.44 * (s.fta || 0));
  const ts = tsDen > 0 ? (s.pts || 0) / tsDen * 100 : null;
  const efg = s.fga > 0 ? ((s.fgm || 0) + 0.5 * (s.tpm || 0)) / s.fga * 100 : null;
  const per36 = (tot) => (hasMin && tot != null ? tot * 36 / min : null);
  const loadTot = (s.fga || 0) + 0.44 * (s.fta || 0) + (s.tov || 0);
  const loadPg = g ? loadTot / g : null;
  const role = roleFromLoad(loadPg);

  return {
    season: s.season,
    seasonLabel: `${s.season} Summer`,
    gradeLevel: gradeLevel(prospect?.gradYear, +s.season),
    team: s.team || null,
    gp: g,
    mpg: hasMin ? r1(min / g) : null,
    raw: { pts: s.ppg ?? r1((s.pts || 0) / g), reb: s.rpg, ast: s.apg, stl: s.spg, blk: s.bpg, tov: g ? r1((s.tov || 0) / g) : null },
    shooting: { fgPct: s.fgPct ?? null, threePct: s.threePct ?? null, ftPct: s.ftPct ?? null },
    derived: {
      ts: pct1(ts != null ? ts / 100 : null),         // true shooting %
      efg: pct1(efg != null ? efg / 100 : null),       // effective FG%
      per36: { pts: r1(per36(s.pts)), reb: r1(per36(s.reb)), ast: r1(per36(s.ast)) },
      atr: s.tov > 0 ? r1((s.ast || 0) / s.tov) : (s.ast ? null : null), // A:TO (null if no TOV data)
      usageLoad: r1(loadPg),                            // poss used / game (honest proxy)
      ratesAvailable: hasMin,                           // per-36/usage% require minutes
    },
    context: { roleTag: role.tag, usagePct: null /* needs team possessions — not faked */ },
    physical: {
      heightIn: prospect?.heightInches ?? null,         // current only — no per-season history yet
      weightLb: prospect?.weightLbs ?? null,
      ageRelClass: null, stillGrowing: null,
    },
    eval: null, // NULLABLE stub: { composite, axes:{...9}, traits:[] } — populated later
    smallSample: g < MIN_GP,
  };
}

/**
 * buildArc(rawSeasons, prospect) → the arc view-model.
 * rawSeasons: array from gameLogs.json `.seasons` (ascending by season).
 */
export function buildArc(rawSeasons, prospect) {
  const seasons = (rawSeasons || []).map((s) => snapshot(s, prospect));
  const real = seasons.filter((s) => !s.smallSample);
  const latest = seasons[seasons.length - 1] || null;
  const prev = seasons.length > 1 ? seasons[seasons.length - 2] : null;
  return {
    seasons,
    tracked: seasons.length,
    multiSeason: seasons.length >= 2,
    hasMinutes: seasons.some((s) => s.derived.ratesAvailable),
    hasEval: seasons.some((s) => s.eval),
    latest, prev,
    chart: {
      ts: seasons.map((s) => ({ x: s.season, y: s.derived.ts, small: s.smallSample })),
      per36pts: seasons.map((s) => ({ x: s.season, y: s.derived.per36.pts, small: s.smallSample })),
      eval: seasons.map((s) => ({ x: s.season, y: s.eval?.composite ?? null, small: s.smallSample })),
    },
    // The honest one-line read.
    read: arcRead(latest, prev, real.length),
  };
}

function arcRead(latest, prev, realCount) {
  if (!latest) return "No season data yet — profile in progress.";
  if (!prev) return "Single season tracked — the development arc fills in as he's followed across summers.";
  const dTs = latest.derived.ts != null && prev.derived.ts != null ? latest.derived.ts - prev.derived.ts : null;
  const dP36 = latest.derived.per36.pts != null && prev.derived.per36.pts != null ? latest.derived.per36.pts - prev.derived.per36.pts : null;
  const dPts = latest.raw.pts != null && prev.raw.pts != null ? latest.raw.pts - prev.raw.pts : null;
  if (dTs == null) return `${latest.gp} games this season — efficiency trend needs shooting volume to read cleanly.`;
  if (dPts != null && dPts > 1.5 && dTs > 0.5) return "Scoring rose with his role — and he got more efficient too, so the jump is real improvement, not just more shots.";
  if (dPts != null && dPts > 1.5 && dTs <= 0.5) return "Scoring rose, but his efficiency held flat — most of the jump is more shots and a bigger role, not better shooting.";
  if (dTs > 1) return "Efficiency improved year-over-year — getting better, not just busier.";
  if (dTs < -1) return "Efficiency dipped — likely a bigger, tougher role; read the usage band below alongside it.";
  return "Holding his level across seasons.";
}
