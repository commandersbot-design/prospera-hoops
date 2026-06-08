// Scrape every Capitol Hoops Summer League team → src/data/capitolHoops.json
//
// The site runs SportsPress (WordPress). Each team page has player tables with
// per-cell data-label attributes, which makes extraction deterministic. The
// 2026 roster + 2026 stats tables are the FIRST player-list tables on the page
// (current season first); archive seasons follow and are ignored.
//
// Usage:
//   node scripts/scrape-capitol-hoops.mjs            # scrape all, write file
//   node scripts/scrape-capitol-hoops.mjs --validate # scrape the 5 known teams, print, no write

import fs from "fs";
import path from "path";

const TEAMS = [
  ["annapolis-area-christian", "Annapolis Area Christian"], ["bcc", "BCC"],
  ["bengals-blake", "Bengals (Blake)"], ["bethel-academy", "Bethel Academy"],
  ["boys-latin", "Boys' Latin"], ["bruins-broadneck", "Bruins (Broadneck)"],
  ["buccaneers-kent-island", "Buccaneers (Kent Island)"], ["bulldogs-churchill", "Bulldogs (Churchill)"],
  ["bullis", "Bullis"], ["cavaliers-cg-woodson", "Cavaliers (CG Woodson)"],
  ["clarksville-river-hill", "Clarksville (River Hill)"], ["clinton-grace", "Clinton Grace"],
  ["colonels-magruder", "Colonels (Magruder)"], ["concordia-prep", "Concordia Prep"],
  ["coolidge", "Coolidge"], ["crofton", "Crofton"], ["dematha", "DeMatha"],
  ["flint-hill", "Flint Hill"], ["forest-park", "Forest Park"], ["glenelg-country", "Glenelg Country"],
  ["gonzaga", "Gonzaga"], ["good-counsel", "Good Counsel"], ["good-fellas-oxon-hill", "Good Fellas (Oxon Hill)"],
  ["greenbelt-eleanor-roosevelt", "Greenbelt (Eleanor Roosevelt)"], ["grindhouse-huntingtown", "GrindHouse (Huntingtown)"],
  ["hawks-hayfield", "Hawks (Hayfield)"], ["heritage", "Heritage"], ["jfk-kennedy", "JFK (Kennedy)"],
  ["john-carroll", "John Carroll"], ["john-handley", "John Handley"], ["landon", "Landon"],
  ["loyola-blakefield", "Loyola Blakefield"], ["mustangs-meade", "Mustangs (Meade)"],
  ["new-hope-academy", "New Hope Academy"], ["patriot", "Patriot"], ["patriots-wootton", "Patriots (Wootton)"],
  ["potomac-va", "Potomac (VA)"], ["potomac-school", "Potomac School"], ["cardozo", "Purple Storm (DOZA)"],
  ["riverside-va", "Riverside (VA)"], ["rm", "RM"], ["sandy-spring", "Sandy Spring"],
  ["screaming-eagles-seneca-v", "Screaming Eagles (Seneca V)"], ["seahawks-south-river", "Seahawks (South River)"],
  ["severn", "Severn"], ["so-md-christian", "So MD Christian"], ["south-county", "South County"],
  ["spalding", "Spalding"], ["st-johns-dc-2", "St. John's DC"], ["st-marys-annapolis", "St. Mary's Annapolis"],
  ["st-stephens-st-agnes", "St. Stephen's & St. Agnes"], ["swarmin-hornets-damascus-2", "Swarmin' Hornets (Damascus)"],
  ["takoma-academy", "Takoma Academy"], ["tenley-tigers-jackson-reed", "Tenley Tigers (Jackson Reed)"],
  ["the-brook-springbrook", "The Brook (Springbrook)"], ["the-west-northwest", "The West (Northwest)"],
  ["vikes-whitman", "Vikes (Whitman)"], ["virginia-academy", "Virginia Academy"],
  ["wildcats-wj", "Wildcats (WJ)"], ["yorktown", "Yorktown"],
];

const decode = (s) => String(s || "")
  .replace(/&#8211;/g, "–").replace(/&#8217;/g, "'").replace(/&#039;/g, "'").replace(/&#39;/g, "'")
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

function playerTables(html) {
  const tables = [...html.matchAll(/<table class="[^"]*sp-player-list[^"]*"[^>]*>[\s\S]*?<\/table>/g)].map((m) => m[0]);
  let roster = null, stats = null;
  for (const t of tables) {
    if (!stats && /data-label="PPG"/.test(t)) stats = t;
    else if (!roster && /data-label="Position"/.test(t)) roster = t;
  }
  return { roster, stats };
}

function parseRows(tableHtml) {
  if (!tableHtml) return [];
  return [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => {
    const cells = [...m[1].matchAll(/<td[^>]*data-label="([^"]*)"[^>]*>([\s\S]*?)<\/td>/g)];
    const o = {};
    for (const c of cells) {
      let v = c[2];
      const a = v.match(/<a[^>]*>([\s\S]*?)<\/a>/);
      if (a) v = a[1];
      o[c[1]] = decode(v.replace(/<[^>]+>/g, ""));
    }
    return o;
  }).filter((o) => o.Player);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Resilient fetch — retries on network errors / 429 / 5xx with backoff, so a
// transient blip never drops a team.
async function fetchHtml(url, tries = 4) {
  let lastErr;
  for (let a = 0; a < tries; a++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (prospera-preps stats refresh)" } });
      if (res.ok) return await res.text();
      if (res.status === 429 || res.status >= 500) { lastErr = new Error(`HTTP ${res.status}`); await sleep(1500 * (a + 1)); continue; }
      throw new Error(`HTTP ${res.status}`);
    } catch (e) { lastErr = e; await sleep(1500 * (a + 1)); }
  }
  throw lastErr || new Error("fetch failed");
}

async function scrapeTeam(slug, name) {
  const url = `https://capitolhoopssummerleague.com/team/${slug}/`;
  const html = await fetchHtml(url);
  const { roster, stats } = playerTables(html);
  const statsByName = {};
  for (const r of parseRows(stats)) statsByName[r.Player.toLowerCase().replace(/[^a-z0-9]/g, "")] = r;

  const players = parseRows(roster).map((r) => {
    const st = statsByName[r.Player.toLowerCase().replace(/[^a-z0-9]/g, "")] || {};
    return {
      number: r["#"] !== "" && r["#"] != null ? parseInt(r["#"], 10) : null,
      name: r.Player,
      position: r.Position || null,
      height: r.Height || null,
      classYear: r.Class ? parseInt(r.Class, 10) : null,
      social: { twitter: r.Twitter || null, instagram: r.Instagram || null },
      stats: {
        gp: st.G != null ? num(st.G) : 0,
        fgPct: num(st["FG%"]), ftPct: num(st["FT%"]), threePct: num(st["3P%"]),
        rpg: num(st.RPG), apg: num(st.APG), spg: num(st.SPG), bpg: num(st.BPG), ppg: num(st.PPG),
      },
    };
  });

  if (!players.length) throw new Error("no players parsed (page markup may have changed or errored)");
  const coachM = html.match(/Head Coach:\s*([^<]+)</i);
  const headCoach = coachM ? decode(coachM[1]) : null;
  return { slug, name, headCoach, sourceUrl: url, season: "2026", players };
}

async function run() {
  const validate = process.argv.includes("--validate");
  const list = validate
    ? TEAMS.filter(([s]) => ["dematha", "hawks-hayfield", "south-county", "st-stephens-st-agnes", "patriot"].includes(s))
    : TEAMS;

  const outPath = path.join(process.cwd(), "public", "data", "capitolHoops.json");
  // Load existing data so a team that fails to refresh KEEPS its prior stats
  // (never drop a team/player on a transient failure).
  const prior = (!validate && fs.existsSync(outPath)) ? (JSON.parse(fs.readFileSync(outPath, "utf8")).teams || {}) : {};

  const teams = {};
  const fallbacks = []; // teams we couldn't refresh
  let i = 0;
  for (const [slug, name] of list) {
    i++;
    try {
      const t = await scrapeTeam(slug, name);
      teams[slug] = t;
      console.log(`[${i}/${list.length}] ${name}: ${t.players.length} players${t.headCoach ? " · " + t.headCoach : ""}`);
    } catch (e) {
      if (prior[slug]) {
        teams[slug] = prior[slug]; // keep existing — do NOT drop the team
        fallbacks.push({ slug, name, reason: e.message, kept: (prior[slug].players || []).length });
        console.log(`[${i}/${list.length}] ${name}: FAILED (${e.message}) — KEPT prior ${(prior[slug].players || []).length} players`);
      } else {
        fallbacks.push({ slug, name, reason: e.message, kept: 0 });
        console.log(`[${i}/${list.length}] ${name}: FAILED (${e.message}) — no prior data to keep`);
      }
    }
    await new Promise((r) => setTimeout(r, 350 + Math.floor(Math.random() * 250))); // polite + jittered
  }

  if (validate) {
    console.log("\n--- validation sample (top scorer per team) ---");
    for (const t of Object.values(teams)) {
      const top = [...t.players].sort((a, b) => b.stats.ppg - a.stats.ppg)[0];
      console.log(`  ${t.name}: ${top.name} ${top.stats.ppg} ppg (${t.players.length} players)`);
    }
    return;
  }

  const out = {
    _README: "Capitol Hoops Summer League team + player + stat data. Auto-scraped from capitolhoopssummerleague.com via scripts/scrape-capitol-hoops.mjs. 2026 season. Keyed by team slug; each player merges roster bio + season stats.",
    _source: "https://capitolhoopssummerleague.com",
    _note: "Player social handles are from the public source pages — review privacy posture before surfacing in public UI. Stats are small-sample (summer league). Re-run the scraper to refresh.",
    _scrapedAt: new Date().toISOString(),
    teams,
  };

  // Safety: never write a file that has fewer teams than we started with.
  const priorCount = Object.keys(prior).length;
  if (priorCount && Object.keys(teams).length < priorCount) {
    console.error(`\nABORT: would write ${Object.keys(teams).length} teams but prior had ${priorCount}. Not overwriting.`);
    process.exit(1);
  }

  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
  const totalPlayers = Object.values(teams).reduce((s, t) => s + t.players.length, 0);
  const refreshed = Object.keys(teams).length - fallbacks.length;
  console.log(`\nWrote ${Object.keys(teams).length} teams, ${totalPlayers} players → public/data/capitolHoops.json`);
  console.log(`Refreshed ${refreshed} teams · kept-from-cache ${fallbacks.length}`);
  if (fallbacks.length) {
    console.log("\n⚠️  Teams NOT refreshed this run (kept prior data — re-run to retry):");
    fallbacks.forEach((f) => console.log(`   - ${f.name} (${f.slug}): ${f.reason} [kept ${f.kept}]`));
  }
}

run();
