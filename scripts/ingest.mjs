// npm run ingest — box-score intake pipeline (CSV → the app's JSON data).
//
// Reads the intake workbook's three CSV exports from data/intake/ and merges
// them into the app's existing static data so manually-kept teams show up with
// computed season averages and full game logs — no database, no rebuild.
//
//   roster.csv     : team, number, player, pos, grad_year, height, weight
//   schedule.csv   : game_id, date, event, opponent, home_away, team_pts, opp_pts
//   boxscores.csv  : game_id, date, player, min, fgm, fga, tpm, tpa, ftm, fta,
//                    oreb, dreb, ast, stl, blk, tov, pf
//
// Writes into:
//   public/data/capitolHoops.json  → teams{slug}{players[].stats}  (season avgs)
//   public/data/gameLogs.json      → players{nameKey}{games[], season}
//
// Season averages are RECOMPUTED from box scores each run, so re-running with the
// same CSVs is idempotent (identical output). pts = 2*fgm + tpm + ftm; reb = oreb+dreb.
//
// Flags:  --intake <dir>  (default data/intake)   --out <dir> (default public/data)
//         --dry           (compute + print, write nothing)
//
// Player↔game-log keys use the SAME nameKey() the app uses (App.jsx), so imports
// resolve in player cards and the Game Log tab.

import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const flag = (name, def) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : def; };
const DRY = args.includes("--dry");
const INTAKE = path.resolve(flag("--intake", "data/intake"));
const OUT = path.resolve(flag("--out", "public/data"));
// Competition context for this ingest. Defaults match the existing data so a
// plain `npm run ingest` stays summer/Capitol Hoops. For an HS team:
//   --level HS --circuit "Hayfield HS"   ; for AAU: --level AAU --circuit "Prospect U"
const LEVEL = flag("--level", "Summer");                       // HS | Summer | AAU
const CIRCUIT = flag("--circuit", "Capitol Hoops Summer League");
const SEASON = flag("--season", "");

// --- helpers ---------------------------------------------------------------
const nameKey = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");          // matches App.jsx
const slugify = (s) => String(s || "").toLowerCase().replace(/['’.]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const num = (v) => { const n = Number(String(v ?? "").trim()); return Number.isFinite(n) ? n : 0; };
const r1 = (n) => Math.round(n * 10) / 10;
const pct = (made, att) => (att > 0 ? r1((made / att) * 100) : null);

// Minimal RFC-4180-ish CSV parser (handles quoted fields with commas/quotes).
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", q = false;
  text = text.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

function readCSV(name) {
  const fp = path.join(INTAKE, name);
  if (!fs.existsSync(fp)) return [];
  const rows = parseCSV(fs.readFileSync(fp, "utf8"));
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));
}

const readJSON = (file, fallback) => { const fp = path.join(OUT, file); try { return JSON.parse(fs.readFileSync(fp, "utf8")); } catch { return fallback; } };

// --- load intake -----------------------------------------------------------
const roster = readCSV("roster.csv");
const schedule = readCSV("schedule.csv");
const boxscores = readCSV("boxscores.csv");

if (!roster.length && !schedule.length && !boxscores.length) {
  console.log(`No intake rows found in ${INTAKE}. Export Roster / Schedule / Box Scores from the workbook as CSV there, then re-run.`);
  process.exit(0);
}

const warn = [];

// teams + players from roster
const teamsBySlug = {};          // slug -> { slug, name, players: [] }
const playerByKey = {};          // nameKey -> { ...player, teamSlug, teamName }
for (const r of roster) {
  if (!r.team || !r.player) continue;
  const tslug = slugify(r.team);
  const team = (teamsBySlug[tslug] ||= { slug: tslug, name: r.team.trim(), players: [] });
  const key = nameKey(r.player);
  const player = {
    number: r.number || "", name: r.player.trim(), position: r.pos || "",
    height: r.height || "", classYear: r.grad_year || "", weight: r.weight || "",
    _key: key, _team: tslug,
  };
  team.players.push(player);
  if (playerByKey[key]) warn.push(`roster: duplicate player name "${r.player}" — stats may be ambiguous`);
  playerByKey[key] = player;
}

// games from schedule
const gameById = {};
for (const g of schedule) {
  if (!g.game_id) continue;
  const tp = num(g.team_pts), op = num(g.opp_pts);
  const decided = (g.team_pts !== "" && g.opp_pts !== "");
  gameById[g.game_id] = {
    game_id: g.game_id, date: g.date || "", event: g.event || "", opponent: g.opponent || "",
    home_away: g.home_away || "", team_pts: tp, opp_pts: op,
    result: decided ? `${tp > op ? "win" : "loss"} ${tp}-${op}` : "",
  };
}

// stat lines from boxscores → per-player game arrays
const linesByKey = {};           // nameKey -> [ gameLog entries ]
let lineCount = 0;
boxscores.forEach((b, idx) => {
  const row = idx + 2; // 1-based incl header
  if (!b.player) return;
  const key = nameKey(b.player);
  if (!playerByKey[key]) { warn.push(`boxscores row ${row}: player "${b.player}" not in roster — skipped`); return; }
  const g = b.game_id ? gameById[b.game_id] : null;
  if (b.game_id && !g) warn.push(`boxscores row ${row}: game_id "${b.game_id}" not in schedule — line kept with date only`);
  const fgm = num(b.fgm), tpm = num(b.tpm), ftm = num(b.ftm), oreb = num(b.oreb), dreb = num(b.dreb);
  const line = {
    gameId: b.game_id || `${key}-${b.date || row}`,
    date: (g && g.date) || b.date || "", opp: g ? g.opponent : "", result: g ? g.result : "",
    pts: 2 * fgm + tpm + ftm, reb: oreb + dreb,
    ast: num(b.ast), stl: num(b.stl), blk: num(b.blk),
    fgm, fga: num(b.fga), tpm, tpa: num(b.tpa), ftm, fta: num(b.fta),
    oreb, dreb, to: num(b.tov), pf: num(b.pf), min: num(b.min),
  };
  line.team = playerByKey[key]._team;  // which team/context this game belongs to
  line.level = LEVEL;
  // Optional "tracked extras" — only stored when the column is present/non-empty.
  if (b.started !== undefined && b.started !== "") line.gs = num(b.started) ? 1 : 0;
  if (b.dfl !== undefined && b.dfl !== "") line.dfl = num(b.dfl);
  if (b.chg !== undefined && b.chg !== "") line.chg = num(b.chg);
  (linesByKey[key] ||= []).push(line);
  lineCount++;
});

// --- aggregate season averages from the lines ------------------------------
function seasonAgg(lines) {
  const s = lines.reduce((a, l) => {
    for (const k of ["pts", "reb", "ast", "stl", "blk", "to", "min", "fgm", "fga", "tpm", "tpa", "ftm", "fta"]) a[k] += l[k] || 0;
    return a;
  }, { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, to: 0, min: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0 });
  const gp = lines.length;
  const tsDen = 2 * (s.fga + 0.44 * s.fta);
  // Mirror the scraped stats schema (gp, per-game, shooting %) + add TS%.
  // mpg only when minutes were actually recorded, so the column shows "—" not 0
  // for box scores kept without a minutes column.
  const out = {
    gp,
    ppg: r1(s.pts / gp), rpg: r1(s.reb / gp), apg: r1(s.ast / gp), spg: r1(s.stl / gp),
    bpg: r1(s.blk / gp), topg: r1(s.to / gp),
    fgPct: pct(s.fgm, s.fga), threePct: pct(s.tpm, s.tpa), ftPct: pct(s.ftm, s.fta),
    tsPct: tsDen > 0 ? r1((s.pts / tsDen) * 100) : null,
  };
  if (s.min > 0) out.mpg = r1(s.min / gp);
  if (lines.some((l) => l.gs !== undefined)) out.gs = lines.reduce((n, l) => n + (l.gs || 0), 0);
  return out;
}

// --- merge into existing JSON ----------------------------------------------
const ch = readJSON("capitolHoops.json", { teams: {} });
ch.teams ||= {};
const logs = readJSON("gameLogs.json", { players: {} });
logs.players ||= {};

const tally = { teamsNew: 0, teamsUpd: 0, playersNew: 0, playersUpd: 0, gamesNew: 0, gamesUpd: 0 };
const display = [];

for (const [tslug, team] of Object.entries(teamsBySlug)) {
  const existed = !!ch.teams[tslug];
  existed ? tally.teamsUpd++ : tally.teamsNew++;
  const prevPlayers = (ch.teams[tslug]?.players) || [];
  const prevByKey = Object.fromEntries(prevPlayers.map((p) => [nameKey(p.name), p]));

  const outPlayers = team.players.map((p) => {
    const lines = linesByKey[p._key] || [];
    const stats = lines.length ? seasonAgg(lines) : (prevByKey[p._key]?.stats || { gp: 0 });
    (prevByKey[p._key] ? tally.playersUpd++ : tally.playersNew++);
    const { _key, _team, ...clean } = p;
    return { ...clean, stats };
  });

  ch.teams[tslug] = {
    headCoach: ch.teams[tslug]?.headCoach || "", sourceUrl: ch.teams[tslug]?.sourceUrl || "",
    ...ch.teams[tslug], slug: tslug, name: team.name, players: outPlayers,
    level: LEVEL, circuit: CIRCUIT,
    season: SEASON || ch.teams[tslug]?.season || "2026",
  };
  display.push({ team: team.name, players: outPlayers.filter((p) => p.stats.gp) });
}

// games tally (new vs updated against any prior gameId seen in logs)
const seenGameIds = new Set();
for (const e of Object.values(logs.players)) for (const g of (e.games || [])) if (g.gameId) seenGameIds.add(g.gameId);
for (const id of Object.keys(gameById)) (seenGameIds.has(id) ? tally.gamesUpd++ : tally.gamesNew++);

// game logs: the workbook is the system of record for THIS team's games. Replace
// only the player's games from this team (keep other teams/contexts — HS, summer,
// AAU — so a kid's seasons coexist instead of overwriting each other).
for (const [key, lines] of Object.entries(linesByKey)) {
  const p = playerByKey[key];
  const prev = logs.players[key];
  const kept = (prev?.games || []).filter((g) => g.team !== p._team);
  const games = [...kept, ...lines];
  logs.players[key] = {
    name: p.name, slug: slugify(p.name) + (p.classYear ? `-${p.classYear}` : ""),
    games, season: seasonAgg(lines),
    seasons: prev?.seasons || [],
  };
}

// --- write -----------------------------------------------------------------
if (!DRY) {
  // Preserve each file's on-disk formatting to keep diffs reviewable:
  // capitolHoops.json is 2-space pretty; gameLogs.json is minified.
  fs.writeFileSync(path.join(OUT, "capitolHoops.json"), JSON.stringify(ch, null, 2) + "\n");
  fs.writeFileSync(path.join(OUT, "gameLogs.json"), JSON.stringify(logs));
}

// --- report ----------------------------------------------------------------
console.log(`\nPROSPERA HOOPS · ingest`);
console.log(`intake: ${path.relative(process.cwd(), INTAKE)}   →   out: ${path.relative(process.cwd(), OUT)}${DRY ? "   (DRY RUN — nothing written)" : ""}\n`);
console.log(`Teams:      +${tally.teamsNew} new, ${tally.teamsUpd} updated`);
console.log(`Players:    +${tally.playersNew} new, ${tally.playersUpd} updated`);
console.log(`Games:      +${tally.gamesNew} new, ${tally.gamesUpd} updated`);
console.log(`Stat lines: ${lineCount} ingested\n`);

for (const d of display) {
  if (!d.players.length) continue;
  console.log(`Season averages — ${d.team} (from box scores)`);
  for (const p of [...d.players].sort((a, b) => b.stats.ppg - a.stats.ppg)) {
    const s = p.stats;
    console.log(`  ${(p.number ? "#" + p.number : "").padEnd(4)} ${p.name.padEnd(22)} ${String(s.gp).padStart(2)} GP  ${String(s.ppg).padStart(5)} PPG  ${String(s.rpg).padStart(4)} RPG  ${String(s.apg).padStart(4)} APG  FG ${s.fgPct ?? "—"}%  3P ${s.threePct ?? "—"}%  TS ${s.tsPct ?? "—"}%`);
  }
  console.log("");
}

if (warn.length) { console.log(`⚠ ${warn.length} warning(s):`); for (const w of warn) console.log(`  - ${w}`); }
else console.log(`No warnings — every box-score row matched a roster player and a scheduled game.`);
