// Geocode the master DMV school directory in place → adds lat/lng to each
// school in public/data/dmvSchools.json so the directory can plot on the Map.
//
// Uses OpenStreetMap Nominatim, bounded to the DMV viewbox, 1 req/sec, with a
// "School Name, City, ST" query and a "City, ST" fallback. City-fallback points
// get a small deterministic jitter so co-located schools don't stack on one pin.
// Idempotent/resumable: schools that already have lat/lng are skipped.
//
// Usage:  node scripts/geocode-dmv-schools.mjs

import fs from "fs";
import path from "path";

const outPath = path.join(process.cwd(), "public", "data", "dmvSchools.json");
const VIEWBOX = "-78.6,39.9,-76.0,38.0"; // west,north,east,south — DMV + commuter exurbs
const UA = "prospera-preps/1.0 (DMV HS recruiting site, dev geocoding)";
const STATE_FULL = { VA: "Virginia", MD: "Maryland", DC: "District of Columbia" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geo(q) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&viewbox=${VIEWBOX}&bounded=1`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) return null;
      const j = await res.json();
      if (!j.length) return null;
      return { lat: +(+j[0].lat).toFixed(5), lng: +(+j[0].lon).toFixed(5) };
    } catch {
      await sleep(3000); // transient network blip — back off and retry
    }
  }
  return null;
}

// Deterministic small jitter (~±0.008°) from a string, so city-fallback pins spread.
function jitter(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return ((h % 1000) / 1000 - 0.5) * 0.016;
}

async function run() {
  const data = JSON.parse(fs.readFileSync(outPath, "utf8"));
  const schools = data.schools || [];
  let done = 0, hit = 0, cityFb = 0, miss = 0;
  for (const s of schools) {
    if (s.lat != null && s.lng != null) { done++; continue; }
    const st = STATE_FULL[s.state] || s.state;
    let r = await geo(`${s.name}, ${s.city || ""}, ${st}`);
    await sleep(1100);
    if (!r && s.city) { r = await geo(`${s.city}, ${st}`); await sleep(1100); if (r) { r = { lat: r.lat + jitter(s.name), lng: r.lng + jitter(s.name + "x") }; cityFb++; } }
    if (r) { s.lat = r.lat; s.lng = r.lng; hit++; }
    else { miss++; }
    done++;
    if (done % 20 === 0) {
      fs.writeFileSync(outPath, JSON.stringify(data, null, 2) + "\n"); // checkpoint
      console.log(`[${done}/${schools.length}] geocoded — ${hit} hit (${cityFb} city-fallback), ${miss} miss`);
    }
  }
  data._geocodedAt = new Date().toISOString();
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2) + "\n");
  const withCoords = schools.filter((s) => s.lat != null).length;
  console.log(`Done. ${withCoords}/${schools.length} schools have coordinates (${miss} unresolved).`);
}

run().catch((e) => { console.error(e.message); process.exit(1); });
