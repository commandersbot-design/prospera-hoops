// Geocode every school in the database → public/data/schoolLocations.json
//
// Uses OpenStreetMap Nominatim, bounded to a DMV viewbox so results stay
// regional (auto-disambiguates "Heritage", "Potomac", etc.). Pulls lat/lng
// plus county + state from address details — which also backfills the county
// gap for schools the promote script left null.
//
// Respects Nominatim usage policy: 1 req/sec, descriptive User-Agent.
//
// Usage:  node scripts/geocode-schools.mjs

import fs from "fs";
import path from "path";

const root = process.cwd();
const prospectsPath = path.join(root, "public", "data", "prospects.json");
const outPath = path.join(root, "public", "data", "schoolLocations.json");

const VIEWBOX = "-77.9,39.8,-76.2,38.2"; // west,north,east,south — the DMV
const UA = "prospera-preps/1.0 (DMV HS recruiting site, dev geocoding)";
const STATE_CODE = { Virginia: "VA", Maryland: "MD", "District of Columbia": "DC" };

// Manual overrides for schools that miss or geocode to the wrong place.
// Approximate but accurate-enough coordinates for known DMV schools.
const OVERRIDES = {
  "Concordia Prep":            { lat: 39.398, lng: -76.601, state: "MD", county: "Baltimore" },
  "Cardozo":                   { lat: 38.922, lng: -77.027, state: "DC", county: null },
  "Potomac":                   { lat: 38.594, lng: -77.323, state: "VA", county: "Prince William" }, // Potomac Sr, Dumfries
  "Riverside":                 { lat: 39.078, lng: -77.514, state: "VA", county: "Loudoun" },         // Riverside, Lansdowne
  "John Handley":              { lat: 39.173, lng: -78.175, state: "VA", county: "Winchester" },
  "Loyola Blakefield":         { lat: 39.411, lng: -76.632, state: "MD", county: "Baltimore" },
  "RM":                        { lat: 39.090, lng: -77.153, state: "MD", county: "Montgomery" },  // Richard Montgomery
  "So MD Christian":           { lat: 38.539, lng: -76.844, state: "MD", county: "Charles" },
  "St. Stephen's & St. Agnes": { lat: 38.811, lng: -77.090, state: "VA", county: "Alexandria" },
  "WJ":                        { lat: 39.030, lng: -77.118, state: "MD", county: "Montgomery" },  // Walter Johnson
  "Flint Hill":                { lat: 38.880, lng: -77.300, state: "VA", county: "Fairfax" },     // geocoded wrong (MD)
  // Schools introduced by the 247 ranked-recruits import (DMV-area).
  "Gillion Basketball Academy":{ lat: 38.789, lng: -77.187, state: "VA", county: "Fairfax" },        // Springfield
  "Bishop O'Connell":          { lat: 38.884, lng: -77.135, state: "VA", county: "Arlington" },
  "James Hubert Blake":        { lat: 39.103, lng: -77.025, state: "MD", county: "Montgomery" },      // Silver Spring
  "Bishop McNamara":           { lat: 38.843, lng: -76.889, state: "MD", county: "Prince George's" }, // Forestville
  "Georgetown Preparatory":    { lat: 39.027, lng: -77.118, state: "MD", county: "Montgomery" },      // North Bethesda
  "Mt. Zion Prep":             { lat: 38.967, lng: -76.864, state: "MD", county: "Prince George's" }, // Lanham
  "St. Andrew's Episcopal":    { lat: 39.038, lng: -77.208, state: "MD", county: "Montgomery" },      // Potomac
  "Mount Saint Joseph":        { lat: 39.285, lng: -76.690, state: "MD", county: "Baltimore" },
  "Our Lady Of Mount Carmel":  { lat: 39.310, lng: -76.456, state: "MD", county: "Baltimore" },       // Essex
  "Archbishop Carroll":        { lat: 38.939, lng: -76.994, state: "DC", county: null },
  "Sidwell Friends School":    { lat: 38.948, lng: -77.078, state: "DC", county: null },
  // Schools introduced by the 2027/2028 ranked-recruits import (DMV-area).
  "The St. James":             { lat: 38.776, lng: -77.165, state: "VA", county: "Fairfax" },        // Springfield
  "St. Frances Academy":       { lat: 39.301, lng: -76.601, state: "MD", county: "Baltimore" },
  "Archbishop Spalding":       { lat: 39.137, lng: -76.696, state: "MD", county: "Anne Arundel" },   // Severn
  "Calvert Hall College":      { lat: 39.408, lng: -76.610, state: "MD", county: "Baltimore" },      // Towson
  "Highland School":           { lat: 38.717, lng: -77.795, state: "VA", county: "Fauquier" },       // Warrenton
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geo(q) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&viewbox=${VIEWBOX}&bounded=1&addressdetails=1`;
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) return null;
  const j = await r.json();
  if (!j[0]) return null;
  const a = j[0].address || {};
  const stateName = a.state || null;
  return {
    lat: +j[0].lat,
    lng: +j[0].lon,
    state: STATE_CODE[stateName] || null,
    county: a.county ? a.county.replace(/ County$/, "") : null,
  };
}

const prospects = JSON.parse(fs.readFileSync(prospectsPath, "utf8")).prospects || [];
const schools = [...new Set(prospects.map((p) => p.school).filter(Boolean))].sort();

// Incremental: keep prior results, force overrides, only geocode what's missing.
const out = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : {};
let hits = Object.keys(out).length;
const misses = [];
for (const school of schools) {
  if (OVERRIDES[school]) { if (!out[school] || true) hits += out[school] ? 0 : 1; out[school] = OVERRIDES[school]; console.log(`• ${school} (override)`); continue; }
  if (out[school]) continue; // already geocoded
  let res = await geo(`${school} High School`);
  if (!res) { await sleep(1100); res = await geo(`${school} School`); }
  if (!res) { await sleep(1100); res = await geo(school); }
  if (res) {
    out[school] = res;
    hits++;
    console.log(`✓ ${school} → ${res.county || "?"}, ${res.state || "?"}`);
  } else {
    misses.push(school);
    console.log(`✗ ${school}`);
  }
  await sleep(1100);
}

fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
console.log(`\nGeocoded ${hits}/${schools.length} schools → public/data/schoolLocations.json`);
if (misses.length) console.log(`Misses (add to OVERRIDES): ${misses.join(", ")}`);
