// Scrape per-game box scores (game logs) for every Capitol Hoops player who has
// logged a game → public/data/gameLogs.json.
//
// The season tables (capitolHoops.json) only carry per-game AVERAGES. Each
// player page (/player/<slug>/) also has a `sp-player-game-log` table with the
// full per-game line — opponent, result, and PTS/REB/AST/STL/BLK, shooting
// splits (FGM/FGA, 3PM/3PA, FTM/FTA), OFF/DEF boards, TO, PF. That unlocks the
// game-by-game / longitudinal view on the profile.
//
// Player-page URLs are discovered from each team's roster (the slugs carry
// disambiguating suffixes, e.g. "az-adofo-2", so we can't construct them).
// Only players with GP>0 in capitolHoops.json are fetched. Resumable: already-
// scraped players are skipped, so a re-run after a network blip is cheap.
//
// Usage:  node scripts/scrape-player-gamelogs.mjs

import fs from "fs";
import path from "path";

const root = process.cwd();
const chPath = path.join(root, "public", "data", "capitolHoops.json");
const outPath = path.join(root, "public", "data", "gameLogs.json");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nameKey = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const decode = (s) => String(s || "")
  .replace(/&#8211;/g, "–").replace(/&#8217;/g, "'").replace(/&#039;/g, "'").replace(/&#39;/g, "'")
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const num = (v) => { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, "")); return Number.isFinite(n) ? n : 0; };

// Header label → output field.
const FIELD = {
  PTS: "pts", REB: "reb", AST: "ast", STL: "stl", BLK: "blk",
  FGM: "fgm", FGA: "fga", "3PM": "tpm", "3PA": "tpa", FTM: "ftm", FTA: "fta",
  OFF: "oreb", DEF: "dreb", TO: "to", PF: "pf",
};

async function get(url) {
  for (let i = 0; i < 3; i++) {
    // Abort a stalled connection so one dead socket can't hang the whole run.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (r.ok) return await r.text();
      return null;
    } catch {
      clearTimeout(timer);
      await sleep(2000);
    }
  }
  return null;
}

function parseGameLog(html) {
  const t = (html.match(/<table[^>]*class="sp-player-game-log[^"]*"[^>]*>[\s\S]*?<\/table>/) || [])[0];
  if (!t) return [];
  const rows = [...t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) =>
    [...m[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => decode(c[1].replace(/<[^>]+>/g, " "))));
  if (rows.length < 2) return [];
  const head = rows[0];
  const out = [];
  for (const r of rows.slice(1)) {
    if (!r.length || !r[0]) continue;
    const g = {};
    head.forEach((h, i) => {
      if (h === "Date") g.date = r[i];
      else if (/Opp/.test(h)) g.opp = r[i];
      else if (h === "Result") g.result = r[i];
      else if (FIELD[h]) g[FIELD[h]] = num(r[i]);
    });
    if (g.date) out.push(g);
  }
  return out;
}

// Season-statistics table: ONE row per season the player has played. Carries
// totals (PTS/FGM/FGA/3PM/FTM/FTA/TOV…), minutes (Min), games (G/GS) and the
// site's per-game + %s — everything the multi-season Development Arc needs.
// Returns ALL seasons (ascending) so returning players get a real arc.
function parseSeasons(html) {
  const i = html.indexOf('class="sp-player-statistics');
  if (i < 0) return [];
  const t = html.slice(html.lastIndexOf("<table", i), html.indexOf("</table>", i) + 8);
  const rows = [...t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
    .map((m) => [...m[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => decode(c[1].replace(/<[^>]+>/g, " "))));
  if (rows.length < 2) return [];
  const head = rows[0];
  const ix = (l) => head.indexOf(l);
  const C = { season: ix("Season"), team: ix("Team"), pts: ix("PTS"), fgm: ix("FGM"), fga: ix("FGA"), tpm: ix("3PM"), tpa: ix("3PA"), ftm: ix("FTM"), fta: ix("FTA"), oreb: ix("OFF"), dreb: ix("DEF"), reb: ix("REB"), ast: ix("AST"), stl: ix("STL"), blk: ix("BLK"), tov: ix("TO"), pf: ix("PF"), min: ix("Min"), g: ix("G"), gs: ix("GS"), fgPct: ix("FG%"), ftPct: ix("FT%"), threePct: ix("3P%"), rpg: ix("RPG"), apg: ix("APG"), spg: ix("SPG"), bpg: ix("BPG"), ppg: ix("PPG") };
  if (C.season < 0 || C.min < 0 || C.g < 0) return [];
  const out = [];
  for (const r of rows.slice(1)) {
    const sRaw = r[C.season] || "";
    const ym = sRaw.match(/\d{4}/);
    if (!ym) continue; // skip career/total rows
    const v = (k) => (C[k] >= 0 ? num(r[C[k]]) : null);
    const g = v("g");
    out.push({
      season: ym[0], team: C.team >= 0 ? r[C.team] : null,
      pts: v("pts"), fgm: v("fgm"), fga: v("fga"), tpm: v("tpm"), tpa: v("tpa"), ftm: v("ftm"), fta: v("fta"),
      oreb: v("oreb"), dreb: v("dreb"), reb: v("reb"), ast: v("ast"), stl: v("stl"), blk: v("blk"), tov: v("tov"), pf: v("pf"),
      min: v("min"), g, gs: v("gs"), fgPct: v("fgPct"), ftPct: v("ftPct"), threePct: v("threePct"),
      rpg: v("rpg"), apg: v("apg"), spg: v("spg"), bpg: v("bpg"), ppg: v("ppg"),
      mpg: g ? +((v("min") || 0) / g).toFixed(1) : 0,
    });
  }
  return out.sort((a, b) => a.season.localeCompare(b.season));
}

async function run() {
  const ch = JSON.parse(fs.readFileSync(chPath, "utf8"));
  const out = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : { players: {} };
  out.players = out.players || {};

  // Players with GP>0 — we want a log for EVERY one of them. Keep display names
  // so we can fall back to a constructed slug when the roster link is missing.
  const played = new Set();
  const nameByKey = {};
  for (const t of Object.values(ch.teams)) for (const p of t.players || []) {
    if ((p.stats?.gp ?? 0) > 0) { const k = nameKey(p.name); played.add(k); if (!nameByKey[k]) nameByKey[k] = p.name; }
  }

  // Discover player-page URLs from each team's roster.
  const urls = new Map(); // nameKey → url
  const slugs = Object.keys(ch.teams);
  for (let i = 0; i < slugs.length; i++) {
    const html = await get(`https://capitolhoopssummerleague.com/team/${slugs[i]}/`);
    await sleep(200);
    if (!html) continue;
    for (const m of html.matchAll(/<a[^>]*href="(https:\/\/capitolhoopssummerleague\.com\/player\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
      const nm = nameKey(m[2].replace(/<[^>]+>/g, ""));
      if (nm && played.has(nm) && !urls.has(nm)) urls.set(nm, m[1]);
    }
  }
  const missing = [...played].filter((k) => !urls.has(k));
  console.log(`Discovered ${urls.size} player pages from rosters; ${missing.length} played players need a slug fallback.`);

  // Candidate player-page URLs for a player: the roster link (if any), then
  // constructed slugs ("first-last", "first-last-2/-3" for disambiguated pages).
  // Strip apostrophes/periods FIRST (the site removes them: "J'lon Lyons" →
  // "jlon-lyons", not "j-lon-lyons"), then hyphenate the rest.
  const slugify = (n) => String(n || "").toLowerCase().replace(/['’.]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  function candidatesFor(nm) {
    const c = [];
    if (urls.has(nm)) c.push(urls.get(nm));
    const base = slugify(nameByKey[nm]);
    for (const s of [base, `${base}-2`, `${base}-3`]) {
      const u = `https://capitolhoopssummerleague.com/player/${s}/`;
      if (s && !c.includes(u)) c.push(u);
    }
    return c;
  }

  let done = 0, withGames = 0, recovered = 0;
  for (const nm of played) {
    if (out.players[nm]?.games?.length) { done++; continue; } // resume
    let best = null; // first valid page; prefer one whose log has games + name matches
    for (const url of candidatesFor(nm)) {
      const html = await get(url);
      await sleep(150);
      if (!html) continue;
      const name = decode((html.match(/<title>([^<]+?)(?:\s*[–-]\s*Capitol Hoops)?<\/title>/) || [])[1] || "");
      const games = parseGameLog(html);
      const seasons = parseSeasons(html); // ALL seasons (ascending) for the Development Arc
      const season = seasons.find((s) => s.season === "2026") || seasons[seasons.length - 1] || null; // current, for MPG features
      const rec = { name, slug: url.replace(/.*\/player\//, "").replace(/\/$/, ""), games, season, seasons };
      // Accept immediately if this page has games AND its title matches the player.
      if (games.length && nameKey(name) === nm) { best = rec; break; }
      if (!best || (games.length && !best.games.length)) best = rec; // remember best-so-far
    }
    done++;
    if (best) {
      out.players[nm] = best;
      if (best.games.length) withGames++;
      if (!urls.has(nm) && best.games.length) recovered++;
    }
    if (done % 50 === 0) {
      out._scrapedAt = new Date().toISOString();
      fs.writeFileSync(outPath, JSON.stringify(out) + "\n");
      console.log(`[${done}/${played.size}] — ${withGames} with games (${recovered} recovered via slug fallback)`);
    }
  }
  out._scrapedAt = new Date().toISOString();
  fs.writeFileSync(outPath, JSON.stringify(out) + "\n");
  const total = Object.values(out.players).reduce((s, p) => s + (p.games?.length || 0), 0);
  console.log(`Done. ${Object.keys(out.players).length} players, ${total} game logs → public/data/gameLogs.json`);
}

run().catch((e) => { console.error(e.message); process.exit(1); });
