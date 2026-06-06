// Build a MASTER DMV high-school directory → public/data/dmvSchools.json
//
// Source: MaxPreps state pages (/dc|md|va/schools/), which embed a clean
// __NEXT_DATA__ JSON list of the top ~200 programs per state with name/city/
// state/url/mascot. We scope to the DMV by city (the directory has no county):
//   - DC: everything (DC is entirely DMV)
//   - MD: the DMV counties' cities (Montgomery, Prince George's, Howard, Anne
//     Arundel, Charles, Frederick, Calvert, St. Mary's) + the Baltimore-area
//     private corridor the league actually includes (Towson, Owings Mills…)
//   - VA: Northern Virginia + the DC-commuter exurbs
//
// This is a directory of WHO EXISTS in the DMV — independent of which players
// we've ingested — so the Schools section can show ~every DMV program (most
// with "not yet tracked" until rostered). It is NOT exhaustive (MaxPreps caps
// the listing at ~200/state and the city filter is curated) — re-run to refresh.
//
// Usage:  node scripts/scrape-dmv-schools.mjs            # scrape + write
//         node scripts/scrape-dmv-schools.mjs --validate # print summary, no write

import fs from "fs";
import path from "path";

const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36" };

const norm = (s) => String(s || "").toLowerCase().trim();

// --- DMV city allowlists (curated) -------------------------------------------
const MD_DMV_CITIES = new Set([
  // Montgomery
  "silver spring", "bethesda", "north bethesda", "rockville", "gaithersburg", "germantown",
  "clarksburg", "potomac", "kensington", "olney", "burtonsville", "damascus", "poolesville",
  "sandy spring", "wheaton", "chevy chase", "brookeville", "montgomery village", "boyds",
  // Prince George's
  "upper marlboro", "hyattsville", "bowie", "laurel", "greenbelt", "beltsville", "college park",
  "bladensburg", "oxon hill", "fort washington", "clinton", "temple hills", "capitol heights",
  "forestville", "district heights", "suitland", "largo", "brandywine", "accokeek", "lanham",
  "springdale", "riverdale", "glenn dale", "mitchellville", "camp springs", "fort meade",
  // Howard
  "columbia", "ellicott city", "clarksville", "fulton", "glenelg", "marriottsville", "elkridge", "woodbine",
  // Anne Arundel
  "annapolis", "severn", "severna park", "crofton", "gambrills", "pasadena", "glen burnie",
  "arnold", "davidsonville", "edgewater", "millersville", "harwood", "odenton", "hanover", "linthicum",
  // Charles
  "waldorf", "la plata", "white plains", "indian head", "pomfret", "bryans road",
  // Frederick
  "frederick", "urbana", "ijamsville", "walkersville", "middletown", "new market", "mount airy",
  "buckeystown", "thurmont",
  // Calvert
  "prince frederick", "huntingtown", "owings", "lusby", "dunkirk", "st. leonard",
  // St. Mary's
  "leonardtown", "great mills", "california", "mechanicsville", "lexington park",
  // Baltimore-area private corridor the DMV league includes
  "baltimore", "towson", "owings mills", "reisterstown", "timonium", "lutherville", "sykesville",
]);

const VA_DMV_CITIES = new Set([
  // Fairfax + inner
  "alexandria", "arlington", "fairfax", "falls church", "mclean", "vienna", "oakton", "annandale",
  "springfield", "burke", "centreville", "chantilly", "herndon", "reston", "great falls", "lorton",
  "clifton", "fairfax station", "south riding",
  // Loudoun
  "ashburn", "leesburg", "sterling", "purcellville", "aldie", "dulles", "brambleton", "hamilton", "round hill",
  // Prince William + Manassas
  "gainesville", "haymarket", "bristow", "dumfries", "woodbridge", "manassas", "manassas park",
  "dale city", "nokesville", "montclair", "occoquan",
  // Stafford / Fredericksburg / King George / Spotsylvania
  "stafford", "fredericksburg", "falmouth", "spotsylvania", "king george",
  // Fauquier / Culpeper / outer commuter + Winchester corridor (Handley)
  "warrenton", "culpeper", "bealeton", "catlett", "remington", "marshall", "the plains",
  "winchester", "stephens city", "berryville", "strasburg", "woodstock", "front royal",
]);

async function fetchGroupings(state) {
  const res = await fetch(`https://www.maxpreps.com/${state}/schools/`, { headers: UA });
  if (!res.ok) throw new Error(`${state}: HTTP ${res.status}`);
  const html = await res.text();
  const m = html.match(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error(`${state}: no embedded JSON`);
  return JSON.parse(m[1]).props.pageProps.groupings || [];
}

function slugFromUrl(url) {
  const m = String(url || "").match(/maxpreps\.com\/([a-z]{2})\/([a-z0-9-]+)\/([a-z0-9-]+)\//);
  return m ? `${m[1]}/${m[2]}/${m[3]}` : null;
}

function inDmv(state, city) {
  const c = norm(city);
  if (state === "dc") return c !== "fpo";
  if (state === "md") return MD_DMV_CITIES.has(c);
  if (state === "va") return VA_DMV_CITIES.has(c);
  return false;
}

async function run() {
  const validate = process.argv.includes("--validate");
  const out = [];
  const dropped = { md: [], va: [] };
  for (const state of ["dc", "md", "va"]) {
    const g = await fetchGroupings(state);
    let kept = 0;
    for (const s of g) {
      if (!inDmv(state, s.city)) { if (dropped[state]) dropped[state].push(s.city); continue; }
      out.push({
        name: s.name,
        city: s.city || null,
        state: state.toUpperCase(),
        slug: slugFromUrl(s.canonicalUrl),
        url: s.canonicalUrl || null,
        mascotUrl: s.mascotUrl || null,
        source: "maxpreps",
      });
      kept++;
    }
    console.log(`${state.toUpperCase()}: ${kept} DMV schools (of ${g.length} listed)`);
    await new Promise((r) => setTimeout(r, 300));
  }
  out.sort((a, b) => a.name.localeCompare(b.name));

  if (validate) {
    console.log(`\nTotal DMV schools: ${out.length}`);
    console.log("Sample:", out.slice(0, 8).map((s) => `${s.name} (${s.city}, ${s.state})`).join(" · "));
    const uniqDropped = [...new Set([...dropped.md, ...dropped.va])].sort();
    console.log(`\nNon-DMV cities dropped (${uniqDropped.length}):`, uniqDropped.slice(0, 40).join(", "));
    return;
  }

  const payload = {
    _README: "Master DMV high-school directory scraped from MaxPreps (top ~200/state, city-scoped to the DMV) via scripts/scrape-dmv-schools.mjs. Directory of programs that exist DMV-wide, independent of which players are ingested. Not exhaustive; re-run to refresh.",
    _source: "https://www.maxpreps.com",
    _scrapedAt: new Date().toISOString(),
    schools: out,
  };
  const dest = path.join(process.cwd(), "public", "data", "dmvSchools.json");
  fs.writeFileSync(dest, JSON.stringify(payload, null, 2) + "\n");
  console.log(`\nWrote ${out.length} DMV schools → public/data/dmvSchools.json`);
}

run().catch((e) => { console.error(e.message); process.exit(1); });
