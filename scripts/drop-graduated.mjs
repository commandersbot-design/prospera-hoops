// Remove graduated classes from the prospect database.
//
// Prospera Preps tracks CURRENT high-school prospects. The Capitol Hoops
// summer-league scrape pulls in whoever was on a roster, including players who
// have since graduated — e.g. as of the 2026-27 cycle, the class of 2026 has
// left high school. This drops any prospect whose (normalized) grad year is
// below ACTIVE_FLOOR, and nulls impossible future years (scrape typos like
// "2039") so they don't create phantom recruiting classes in the UI.
//
// Bump ACTIVE_FLOOR each cycle (2027 → 2028 → ...). Re-runnable any time.
//
// Usage:  node scripts/drop-graduated.mjs

import fs from "fs";
import path from "path";

const ACTIVE_FLOOR = 2027;       // classes below this have graduated
const MAX_PLAUSIBLE = 2030;      // the furthest-out class a current HS player can be

const root = process.cwd();
const prospectsPath = path.join(root, "public", "data", "prospects.json");

const norm = (y) => {
  if (y == null || y === "") return null;
  const n = Number(y);
  if (Number.isNaN(n)) return null;
  return n < 100 ? 2000 + n : n;
};

const file = JSON.parse(fs.readFileSync(prospectsPath, "utf8"));
const before = file.prospects.length;

const dropped = [];
let fixedTypos = 0;

file.prospects = file.prospects.filter((p) => {
  const y = norm(p.gradYear);
  if (y != null && y < ACTIVE_FLOOR) {
    dropped.push(`${p.name} (${p.school}) '${String(y).slice(2)}`);
    return false; // graduated — remove
  }
  return true;
});

// Null impossible future years (keep the player, drop the bogus class).
for (const p of file.prospects) {
  const y = norm(p.gradYear);
  if (y != null && y > MAX_PLAUSIBLE) {
    console.log(`Nulled implausible gradYear ${p.gradYear} on ${p.name} (${p.school})`);
    p.gradYear = null;
    fixedTypos++;
  }
}

fs.writeFileSync(prospectsPath, JSON.stringify(file, null, 2) + "\n");

console.log(`\nDropped ${dropped.length} graduated (< ${ACTIVE_FLOOR}); nulled ${fixedTypos} typo year(s).`);
console.log(`Prospects: ${before} → ${file.prospects.length}`);
if (dropped.length) console.log("Removed:\n  " + dropped.join("\n  "));
