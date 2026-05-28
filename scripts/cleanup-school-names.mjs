// Fix school names on auto-promoted prospects.
//
// The team-name → school derivation had two problems:
//   1. State-qualifier parens: "Potomac (VA)" and "Riverside (VA)" both
//      derived to "VA" — collapsing two different schools into one.
//   2. Nickname parens: "Purple Storm (DOZA)" derived to "DOZA" (= Cardozo).
//
// This rewrites prospect.school for every Capitol-Hoops-sourced stub using a
// canonical name per team — reassigning each player to their CORRECT school
// (which un-merges the "VA" collision, since each player belongs to one team).
// Manually-authored prospects (samples + Isaiah Martin) are left untouched.
//
// Usage:  node scripts/cleanup-school-names.mjs

import fs from "fs";
import path from "path";

const root = process.cwd();
const prospectsPath = path.join(root, "public", "data", "prospects.json");
const chPath = path.join(root, "public", "data", "capitolHoops.json");

// Per-team-slug canonical name overrides (fuller / corrected names).
const CANON = {
  "dematha": "DeMatha Catholic",
  "hawks-hayfield": "Hayfield Secondary",
  "cardozo": "Cardozo",
};

function canonicalSchool(slug, teamName) {
  if (CANON[slug]) return CANON[slug];
  const m = String(teamName || "").match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (m) {
    const before = m[1].trim(), paren = m[2].trim();
    if (/^(VA|MD|DC)$/i.test(paren)) return before; // state qualifier → use the name before it
    return paren;                                    // mascot (School) → the school
  }
  return String(teamName || "").trim();
}

const nameSlug = (n) => String(n || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const prospectsFile = JSON.parse(fs.readFileSync(prospectsPath, "utf8"));
const ch = JSON.parse(fs.readFileSync(chPath, "utf8"));
const bySlug = {};
for (const p of prospectsFile.prospects) bySlug[nameSlug(p.name)] = p;

let changed = 0;
const renames = {};
for (const [slug, team] of Object.entries(ch.teams || {})) {
  const school = canonicalSchool(slug, team.name);
  for (const pl of team.players || []) {
    const p = bySlug[nameSlug(pl.name)];
    if (!p || p.source !== "capitol-hoops-2026") continue;
    if (p.school !== school) {
      renames[`${p.school} → ${school}`] = (renames[`${p.school} → ${school}`] || 0) + 1;
      p.school = school;
      changed++;
    }
  }
}

fs.writeFileSync(prospectsPath, JSON.stringify(prospectsFile, null, 2) + "\n");
console.log(`Updated school on ${changed} prospects.`);
const rs = Object.entries(renames).filter(([k]) => k.split(" → ")[0] !== k.split(" → ")[1]);
if (rs.length) {
  console.log("\nRenames applied:");
  for (const [k, n] of rs) console.log(`  ${k}  (${n})`);
}
const schools = [...new Set(prospectsFile.prospects.map((p) => p.school))].sort();
console.log(`\nUnique schools now: ${schools.length}`);
