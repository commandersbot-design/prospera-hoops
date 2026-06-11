// Pre-seed the intake workbook CSVs from a team's existing scraped game logs, so
// you don't re-enter history. Reconstructs schedule.csv (distinct games) and
// boxscores.csv (one row per player per game) from public/data/gameLogs.json,
// matched to the team in capitolHoops.json. Roster.csv is left as-is.
//
//   node scripts/seed-intake.mjs --team hayfield [--out data/intake]
//
// Notes: scraped logs carry no minutes, so the `min` column is left blank (fill
// it going forward). game_id is synthesized (G1..Gn) ordered by date.

import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : d; };
const TEAM = flag("--team", "");
const OUT = path.resolve(flag("--out", "data/intake"));
if (!TEAM) { console.error("Pass --team <name-substring>, e.g. --team hayfield"); process.exit(1); }

const nameKey = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const ch = JSON.parse(fs.readFileSync("public/data/capitolHoops.json", "utf8"));
const logs = (JSON.parse(fs.readFileSync("public/data/gameLogs.json", "utf8")).players) || {};

const team = Object.values(ch.teams).find((t) => new RegExp(TEAM, "i").test(t.name) || new RegExp(TEAM, "i").test(t.slug || ""));
if (!team) { console.error(`No team matching "${TEAM}".`); process.exit(1); }

// CSV-safe (quote fields containing commas/quotes)
const cell = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const line = (arr) => arr.map(cell).join(",");

// Gather every player's games, build distinct team games by date+opponent.
const games = new Map(); // key -> { date, opp, result, ts }
const playerGames = [];   // { player, date, opp, g }
for (const p of team.players) {
  const e = logs[nameKey(p.name)];
  if (!e) continue;
  for (const g of (e.games || [])) {
    const key = `${g.date}|${g.opp}`;
    if (!games.has(key)) games.set(key, { date: g.date, opp: g.opp, result: g.result, ts: Date.parse(g.date) || 0 });
    playerGames.push({ player: p.name, key, g });
  }
}

const ordered = [...games.values()].sort((a, b) => a.ts - b.ts);
const idByKey = new Map();
ordered.forEach((gm, i) => idByKey.set(`${gm.date}|${gm.opp}`, `G${i + 1}`));

// schedule.csv
const schedHead = ["game_id", "date", "event", "opponent", "home_away", "team_pts", "opp_pts"];
const schedRows = ordered.map((gm) => {
  const m = /(\d+)\s*-\s*(\d+)/.exec(gm.result || "");
  const tp = m ? m[1] : "", op = m ? m[2] : "";
  return line([idByKey.get(`${gm.date}|${gm.opp}`), gm.date, "Capitol Hoops", gm.opp, "", tp, op]);
});
fs.writeFileSync(path.join(OUT, "schedule.csv"), [line(schedHead), ...schedRows].join("\n") + "\n");

// boxscores.csv (sorted by game order then player)
const boxHead = ["game_id", "date", "player", "min", "fgm", "fga", "tpm", "tpa", "ftm", "fta", "oreb", "dreb", "ast", "stl", "blk", "tov", "pf"];
playerGames.sort((a, b) => {
  const ga = idByKey.get(a.key), gb = idByKey.get(b.key);
  return ga === gb ? a.player.localeCompare(b.player) : Number(ga.slice(1)) - Number(gb.slice(1));
});
const boxRows = playerGames.map(({ player, key, g }) =>
  line([idByKey.get(key), g.date, player, "", g.fgm, g.fga, g.tpm, g.tpa, g.ftm, g.fta, g.oreb, g.dreb, g.ast, g.stl, g.blk, g.to, g.pf])
);
fs.writeFileSync(path.join(OUT, "boxscores.csv"), [line(boxHead), ...boxRows].join("\n") + "\n");

console.log(`Seeded ${team.name}:`);
console.log(`  schedule.csv  → ${ordered.length} games`);
console.log(`  boxscores.csv → ${playerGames.length} player-game lines`);
console.log(`  (minutes left blank — scrape didn't capture them; fill going forward)`);
console.log(`\nNext: npm run ingest -- --dry   (preview), then drop --dry to write.`);
