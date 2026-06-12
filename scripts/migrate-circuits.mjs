// One-time migration: tag every team with a competition level + circuit, and tag
// every game log with its team + level so HS / Summer / AAU contexts never blend.
// All currently-loaded teams are Capitol Hoops summer-league, so they're stamped
// Summer / "Capitol Hoops Summer League". Safe to re-run (idempotent).
import fs from "fs";

const nameKey = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const chPath = "public/data/capitolHoops.json";
const glPath = "public/data/gameLogs.json";

const ch = JSON.parse(fs.readFileSync(chPath, "utf8"));
const gl = JSON.parse(fs.readFileSync(glPath, "utf8"));
const players = gl.players || {};

// Map each rostered player to their team (slug + level) and stamp the team.
const teamByPlayer = {};
let teamsTagged = 0;
for (const [slug, t] of Object.entries(ch.teams || {})) {
  t.level = t.level || "Summer";
  t.circuit = t.circuit || "Capitol Hoops Summer League";
  t.season = t.season || "2026";
  teamsTagged++;
  for (const p of (t.players || [])) teamByPlayer[nameKey(p.name)] = { slug, level: t.level };
}

// Tag every game log entry's games with their team + level.
let gamesTagged = 0;
for (const [key, e] of Object.entries(players)) {
  const owner = teamByPlayer[key];
  if (!owner) continue;
  for (const g of (e.games || [])) {
    if (!g.team) { g.team = owner.slug; gamesTagged++; }
    if (!g.level) g.level = owner.level;
  }
}

fs.writeFileSync(chPath, JSON.stringify(ch, null, 2) + "\n");
fs.writeFileSync(glPath, JSON.stringify(gl));
console.log(`Tagged ${teamsTagged} teams (level/circuit/season) and ${gamesTagged} game logs (team/level).`);
