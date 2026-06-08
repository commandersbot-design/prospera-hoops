// Promote Capitol Hoops Summer League players into real prospect entries.
//
// The prospect profile is the canonical entity — summer league is just one
// stat source. This creates a lightweight prospect stub for every Capitol
// Hoops player not already tracked, so they all have an openable profile
// keyed off their HIGH SCHOOL (their home base), not the summer team.
//
// Only real/derivable facts are written: name, position, grad year, and
// school/city/state/county (mapped from the team). Everything evaluative
// (rankings, stars, offers, traits, comp, measurables) is left null — to be
// authored later, never fabricated. Summer stats are NOT copied in here;
// they join at render time via the name match (capitolHoopsLinesFor).
//
// Idempotent: re-run after adding more teams; existing prospects (by name
// slug) are skipped, so manually-authored entries are never clobbered.
//
// Usage:  node scripts/promote-from-capitol-hoops.mjs

import fs from "fs";
import path from "path";

const root = process.cwd();
const prospectsPath = path.join(root, "public", "data", "prospects.json");
const chPath = path.join(root, "public", "data", "capitolHoops.json");

// Capitol Hoops team slug → the player's actual high school + location.
const TEAM_LOCATION = {
  "hawks-hayfield":       { school: "Hayfield Secondary",        city: "Alexandria",  state: "VA", county: "Fairfax" },
  "dematha":              { school: "DeMatha Catholic",          city: "Hyattsville", state: "MD", county: "Prince George's" },
  "south-county":         { school: "South County",              city: "Lorton",      state: "VA", county: "Fairfax" },
  "st-stephens-st-agnes": { school: "St. Stephen's & St. Agnes", city: "Alexandria",  state: "VA", county: "Alexandria" },
  "patriot":              { school: "Patriot",                   city: "Nokesville",  state: "VA", county: "Prince William" },
};

const slug = (n) => String(n || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Derive the actual high-school name from the Capitol Hoops team name.
// "Bengals (Blake)" → "Blake"; "Hawks (Hayfield)" → "Hayfield"; "Bullis" → "Bullis".
// A bare-state parenthetical is a LOCATION qualifier, not a school alias, so
// "Potomac (VA)" → "Potomac" (not "VA") and "Riverside (VA)" → "Riverside".
function deriveSchool(teamName) {
  const paren = String(teamName || "").match(/\(([^)]+)\)/);
  if (paren && !/^(VA|MD|DC)$/i.test(paren[1].trim())) return paren[1].trim();
  return String(teamName || "").replace(/\([^)]*\)/, "").trim();
}

const prospectsFile = JSON.parse(fs.readFileSync(prospectsPath, "utf8"));
const ch = JSON.parse(fs.readFileSync(chPath, "utf8"));
const existing = new Set((prospectsFile.prospects || []).map((p) => slug(p.name)));

let added = 0;
const addedNames = [];
for (const [teamSlug, team] of Object.entries(ch.teams || {})) {
  const loc = TEAM_LOCATION[teamSlug] || {};
  for (const pl of team.players || []) {
    const id = slug(pl.name);
    if (!id || existing.has(id)) continue;
    prospectsFile.prospects.push({
      id,
      name: pl.name,
      position: pl.position || null,
      gradYear: pl.classYear || null,
      school: loc.school || deriveSchool(team.name),
      city: loc.city || null,
      state: loc.state || null,
      county: loc.county || null,
      heightInches: null,
      weightLbs: null,
      wingspanInches: null,
      headshot: null,
      stars: null,
      rankings: { national: null, position: null, state: null },
      aau: null,
      status: "uncommitted",
      commitment: null,
      offers: [],
      traits: [],
      comp: null,
      summary: null,
      statLines: [],
      source: "capitol-hoops-2026",
    });
    existing.add(id);
    added++;
    addedNames.push(`${pl.name} (${loc.school || team.name})`);
  }
}

fs.writeFileSync(prospectsPath, JSON.stringify(prospectsFile, null, 2) + "\n");
console.log(`Added ${added} prospect stubs from Capitol Hoops.`);
console.log(`Total prospects now: ${prospectsFile.prospects.length}`);
if (added) {
  console.log("\nFirst few added:");
  addedNames.slice(0, 6).forEach((n) => console.log("  + " + n));
}
