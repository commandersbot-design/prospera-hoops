// Load an AAU roster with FULL cross-linking, so a player surfaces on every team
// they're on and every roster links back to their profile:
//   - capitolHoops.json : the AAU team + its roster (no stats yet; stats arrive
//                         later via scripts/ingest.mjs from the coach workbook)
//   - prospects.json    : each player upserted with school (HS) + aau (this team)
//   - dmvSchools.json   : each player added to their HS roster (so the HS team
//                         page lists them too) when that school exists in the DB
//
// Linking everywhere is by name -> prospect id (nameKey), exactly how the app
// resolves a roster row to a profile. Idempotent: re-running updates in place.
//
// Usage: node scripts/load-aau-roster.mjs   (edit TEAM + ROSTER below)
import fs from "fs";

const nk = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const heightInches = (h) => {
  const m = /(\d+)\s*['’]\s*(\d+)?/.exec(h || "");
  return m ? (+m[1]) * 12 + (+(m[2] || 0)) : null;
};

// ---- EDIT HERE: the team + its roster ---------------------------------------
const TEAM = { slug: "akt-17u", name: "AKT 17u", circuit: "HGSL", season: "2026", level: "AAU", coach: null };
const ROSTER = [
  { number: 0,  name: "Maddox Davis",     height: "5'11", hs: "Virginia Academy", state: "VA" },
  { number: 1,  name: "Elijah Simpkins",  height: "6'2",  hs: "Bishop Ireton",    state: "VA" },
  { number: 3,  name: "Kevin Reyes",      height: "6'3",  hs: "Stone Bridge",     state: "VA" },
  { number: 4,  name: "Ben Edmonds",      height: "6'2",  hs: "Episcopal",        state: "VA" },
  { number: 5,  name: "Alex Garrett",     height: "6'7",  hs: "Sidwell",          state: "DC" },
  { number: 6,  name: "Blake Fitzgerald", height: "6'8",  hs: "Flint Hill",       state: "VA" },
  { number: 7,  name: "Ryan Bahr",        height: "6'6",  hs: "Paul VI",          state: "VA" },
  { number: 8,  name: "Chuma Achifusi",   height: "6'5",  hs: "Episcopal",        state: "VA" },
  { number: 11, name: "O'Neal Allotey",   height: "6'8",  hs: "Mount Vernon",     state: "VA" },
];
// -----------------------------------------------------------------------------

const CH = "public/data/capitolHoops.json", PR = "public/data/prospects.json", DMV = "public/data/dmvSchools.json";
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const write = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 2) + "\n");

const ch = read(CH), prj = read(PR), dmvj = read(DMV);
const schools = dmvj.schools;

// Resolve a roster's HS name to the canonical dmvSchools entry (exact, then fuzzy).
function resolveSchool(name) {
  const k = nk(name);
  return schools.find((x) => nk(x.name) === k)
    || schools.find((x) => nk(x.name).includes(k) || k.includes(nk(x.name)))
    || null;
}

// 1) capitolHoops AAU team (roster only — stats come from the coach workbook).
ch.teams[TEAM.slug] = {
  slug: TEAM.slug, name: TEAM.name, headCoach: TEAM.coach, sourceUrl: null,
  season: TEAM.season, level: TEAM.level, circuit: TEAM.circuit,
  players: ROSTER.map((r) => ({ number: r.number, name: r.name, position: r.position || null, height: r.height || null, classYear: r.gradYear || null })),
};

// 2) prospects upsert + 3) HS roster cross-link
const byId = new Map(prj.prospects.map((p) => [p.id, p]));
let created = 0, updated = 0, hsLinked = 0;
for (const r of ROSTER) {
  const id = nk(r.name);
  const sc = resolveSchool(r.hs);
  const schoolName = sc ? sc.name : r.hs;
  let p = byId.get(id);
  if (!p) {
    p = {
      id, name: r.name, position: r.position || null, gradYear: r.gradYear || null,
      school: schoolName, city: sc?.city || null, state: r.state || sc?.state || null, county: null,
      heightInches: heightInches(r.height), weightLbs: null, wingspanInches: null,
      stars: null, rankings: { national: null, position: null, state: null },
      aau: TEAM.name, status: "uncommitted", commitment: null, offers: [], traits: [], summary: null,
    };
    prj.prospects.push(p); byId.set(id, p); created++;
  } else {
    p.aau = TEAM.name;
    if (!p.school) p.school = schoolName;
    if (p.heightInches == null) p.heightInches = heightInches(r.height);
    if (!p.state) p.state = r.state || sc?.state || null;
    if (!p.city && sc?.city) p.city = sc.city;
    updated++;
  }
  if (sc) {
    sc.roster = sc.roster || [];
    if (!sc.roster.some((x) => nk(x.name) === id)) {
      sc.roster.push({ id, name: r.name, number: r.number, pos: p.position || null, class: p.gradYear ? String(p.gradYear).slice(2) : null });
    }
    hsLinked++;
  } else {
    console.log(`  · ${r.name}: HS "${r.hs}" not in dmvSchools — profile keeps it as text, no HS team page.`);
  }
}

write(CH, ch); write(PR, prj); write(DMV, dmvj);
console.log(`${TEAM.name}: ${ROSTER.length} players (${created} new, ${updated} updated) · ${hsLinked} HS roster cross-links.`);
