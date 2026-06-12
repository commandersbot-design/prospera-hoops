// Calibrate + preview the archetype classifier against the real DMV cohort.
// Cohort = Capitol Hoops players with >=3 game logs (rich box scores). Thresholds
// are PERCENTILE RANKS within the cohort, so they self-calibrate to the data and
// the label stays descriptive (never a ranking). Prints the cohort distribution
// (sanity check) + each Hayfield player's metrics, percentiles, and assignment.
//
//   node scripts/calibrate-archetypes.mjs [--team hayfield]
import fs from "fs";

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const TEAM = arg("--team", "hayfield");
const nameKey = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const ch = JSON.parse(fs.readFileSync("public/data/capitolHoops.json", "utf8"));
const logs = JSON.parse(fs.readFileSync("public/data/gameLogs.json", "utf8")).players || {};

const GUARD = new Set(["PG","SG","G","CG","PG/SG","PG/G","GUARD"]);
const WING  = new Set(["W","SF","WING","G/F","G/W","SG/SF","WF","W/F","GF"]);
const BIG   = new Set(["C","PF","F","F/C","SF/PF","FORWARD","FF","FC"]);
function bucket(pos) {
  const s = String(pos || "").toUpperCase().replace(/\s/g, "");
  if (GUARD.has(s)) return "Guard";
  if (WING.has(s)) return "Wing";
  if (BIG.has(s)) return "Big";
  return "?";
}

// --- build cohort rows ------------------------------------------------------
const MIN_GP = 3;
const rows = [];
for (const t of Object.values(ch.teams)) for (const p of (t.players || [])) {
  const e = logs[nameKey(p.name)];
  const gms = (e && e.games) || [];
  if (gms.length < MIN_GP) continue;
  const s = gms.reduce((a, g) => { for (const k of ["pts","fga","fta","tpa","tpm","ftm","ast","to","oreb","dreb","reb","stl","blk"]) a[k] += g[k] || 0; return a; }, { pts:0,fga:0,fta:0,tpa:0,tpm:0,ftm:0,ast:0,to:0,oreb:0,dreb:0,reb:0,stl:0,blk:0 });
  const gp = gms.length;
  rows.push({
    name: p.name, team: t.name, pos: bucket(p.position), gp,
    ppg: s.pts / gp,
    ts: (s.fga + 0.44 * s.fta) > 0 ? s.pts / (2 * (s.fga + 0.44 * s.fta)) : 0,
    tpar: s.fga > 0 ? s.tpa / s.fga : 0,
    ftr: s.fga > 0 ? s.fta / s.fga : 0,
    tp3: s.tpa >= 5 ? s.tpm / s.tpa : null,   // 3P% only when enough volume
    ato: s.to > 0 ? s.ast / s.to : (s.ast > 0 ? 5 : 0),
    apg: s.ast / gp, rpg: s.reb / gp, bpg: s.blk / gp,
    orebShare: (s.oreb + s.dreb) > 0 ? s.oreb / (s.oreb + s.dreb) : 0,
    stocks: (s.stl + s.blk) / gp,
    load: (s.fga + 0.44 * s.fta + s.to) / gp,
  });
}

// --- percentile-rank helpers ------------------------------------------------
const sorted = {};
const METRICS = ["ppg","ts","tpar","ftr","tp3","ato","apg","rpg","bpg","orebShare","stocks","load"];
for (const m of METRICS) sorted[m] = rows.map((r) => r[m]).filter((v) => v != null && isFinite(v)).sort((a, b) => a - b);
function P(row, m) {
  const v = row[m]; if (v == null || !isFinite(v)) return null;
  const a = sorted[m]; let lo = 0, hi = a.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (a[mid] <= v) lo = mid + 1; else hi = mid; }
  return lo / a.length; // fraction <= v
}

// --- the classifier (ordered; first match wins) -----------------------------
// Each rule: percentile gates + the 2-3 stats that justify the label ("why").
function classify(r) {
  const pp = P(r, "ppg"), pl = P(r, "load"), pa = P(r, "apg"), pao = P(r, "ato"),
        pt = P(r, "tpar"), p3 = P(r, "tp3"), pf = P(r, "ftr"), pr = P(r, "rpg"),
        pb = P(r, "bpg"), po = P(r, "orebShare"), ps = P(r, "stocks"), pts_ = P(r, "ts");
  const big = r.pos === "Big", perim = r.pos === "Guard" || r.pos === "Wing";
  const why = (...x) => x.join(" · ");

  if (pa >= .90 && pa > pp)                return ["Lead Playmaker", why(`${r.apg.toFixed(1)} apg`, "pass-first")];   // assists clearly exceed scoring
  if (pp >= .85 && pa >= .78 && pl >= .80) return ["Primary Shot Creator", why(`${r.ppg.toFixed(1)} ppg`, "high usage", `${r.apg.toFixed(1)} apg`)];
  if (pa >= .82 && pao >= .55)             return ["Lead Playmaker", why(`${r.apg.toFixed(1)} apg`, `${r.ato.toFixed(1)} AST:TO`)];
  if (pp >= .80 && pl >= .75)              return ["Primary Scorer", why(`${r.ppg.toFixed(1)} ppg`, "high-volume scoring")];
  if (pt >= .75 && p3 != null && p3 >= .70 && pp >= .50) return ["Movement Shooter", why(`${(r.tp3*100).toFixed(0)}% on volume 3s`)];
  if (perim && pt >= .60 && p3 != null && p3 >= .45 && ps >= .60) return ["3&D Wing", why("3-point volume", `${r.stocks.toFixed(1)} stocks`)];
  if (big && pt >= .55)                    return ["Stretch Big", why("big who spaces", `${r.tpar.toFixed(2)} 3PA rate`)];
  if (big && pb >= .85)                    return ["Defensive Anchor", why(`${r.bpg.toFixed(1)} bpg`)];
  if (big && pr >= .70 && po >= .50 && pt < .45) return ["Rebounding Big", why(`${r.rpg.toFixed(1)} rpg`, "offensive glass")];
  if (pr >= .85)                           return ["Glass Cleaner", why(`${r.rpg.toFixed(1)} rpg`)];
  if (pf >= .80 && pt < .45 && pp >= .50)  return ["Slasher / Foul-Drawer", why(`${r.ftr.toFixed(2)} FT rate`, "gets to the line")];
  if (pt >= .80 && p3 != null && p3 >= .55 && pl < .55) return ["Spot-Up Specialist", why("low-usage shooter", `${(r.tp3*100).toFixed(0)}% 3P`)];
  if (perim && pp >= .55 && ps >= .62)     return ["Two-Way Wing", why("scores", `${r.stocks.toFixed(1)} stocks`)];
  if (pl <= .40 && (pao >= .50 || pts_ >= .55)) return ["Low-Usage Glue", why("efficient role", "low turnovers")];
  if (pp <= .25 && pl <= .30)              return [null, why("limited role / small sample — no tag")];
  return ["Rotation Contributor", why("balanced role")];
}

// --- cohort distribution (sanity) -------------------------------------------
const dist = {};
for (const r of rows) { const [a] = classify(r); const k = a || "(no tag)"; dist[k] = (dist[k] || 0) + 1; }
console.log(`Cohort: ${rows.length} players (>=${MIN_GP} GP) — archetype distribution:`);
for (const [a, n] of Object.entries(dist).sort((x, y) => y[1] - x[1]))
  console.log(`  ${String(n).padStart(3)}  ${(100*n/rows.length).toFixed(0).padStart(2)}%  ${a}`);

// --- Hayfield preview -------------------------------------------------------
const team = rows.filter((r) => new RegExp(TEAM, "i").test(r.team));
console.log(`\n${team[0]?.team || TEAM} — archetype assignments:\n`);
for (const r of team.sort((a, b) => b.ppg - a.ppg)) {
  const [a, why] = classify(r);
  const pcts = `pts ${(100*P(r,"ppg")).toFixed(0)} · eff ${(100*P(r,"ts")).toFixed(0)} · ast ${(100*P(r,"apg")).toFixed(0)} · reb ${(100*P(r,"rpg")).toFixed(0)} · 3PAr ${(100*P(r,"tpar")).toFixed(0)} · stk ${(100*P(r,"stocks")).toFixed(0)}`;
  const tag = a ? a + (r.gp < 5 ? `  (early read · ${r.gp} GP)` : "") : "(no archetype shown — limited role)";
  console.log(`  ${r.name.padEnd(20)} ${r.pos.padEnd(5)} ${r.gp}g  ${r.ppg.toFixed(1)}p ${r.ts.toFixed(2)}TS`);
  console.log(`      → ${tag}  (${why})`);
  console.log(`        cohort %ile: ${pcts}\n`);
}
