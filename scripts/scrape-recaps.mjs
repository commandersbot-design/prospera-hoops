// Scrape Capitol Hoops game recaps → public/data/gameRecaps.json
//
// The site is WordPress (Elementor theme). The REST API exposes every post with
// a clean date/title/content, so we pull all posts once, keep the game-recap
// ones, and parse each recap's body into individual games ("Game N: A vs. B").
//
// Recap detection is slug-based and tagged by `type` so the site can filter:
//   recap          — day-N / game-recap / *-recap posts (the core game recaps)
//   notable-games  — "Notable Games of Day N" roundups
//   takeaways      — "Takeaways from X vs. Y" single-game writeups
// Previews, features, and players-of-the-week posts are intentionally excluded.
//
// Usage:
//   node scripts/scrape-recaps.mjs            # scrape all, write file
//   node scripts/scrape-recaps.mjs --list     # just print what would be captured

import fs from "fs";
import path from "path";

const API = "https://capitolhoopssummerleague.com/wp-json/wp/v2/posts";

const decode = (s) => String(s || "")
  .replace(/&#8211;/g, "–").replace(/&#8212;/g, "—")
  .replace(/&#8217;|&#039;|&#39;/g, "'").replace(/&#8216;/g, "'")
  .replace(/&#8220;|&#8221;/g, '"').replace(/&quot;/g, '"')
  .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
  .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

// Slug → recap type, or null if not a game recap.
function recapType(slug) {
  if (/notable-games-of-day/.test(slug)) return "notable-games";
  if (/^takeaways-from/.test(slug)) return "takeaways";
  if (/recap/.test(slug) || /game-recap/.test(slug) || /^day-\d+/.test(slug)) return "recap";
  return null;
}

// Split a post's rendered HTML into ordered blocks (headings + paragraphs), so
// game headers survive whether they're <h3>, a "Game N:" paragraph, or a bold
// matchup line. Each block: { tag: "h2".."h6"|"p", text }.
function blocks(html) {
  let bs = [...html.matchAll(/<(h[2-6]|p)[^>]*>([\s\S]*?)<\/\1>/g)]
    .map((m) => ({ tag: m[1], text: decode(m[2]) }))
    .filter((b) => b.text);
  if (bs.length === 0) {
    bs = decode(html).split(/\n+/).map((s) => s.trim()).filter((s) => s.length > 1).map((t) => ({ tag: "p", text: t }));
  }
  return bs;
}

const paragraphsOf = (bs) => bs.filter((b) => b.tag === "p").map((b) => b.text);

// Matchup line, optionally trailed by a score. Kept short so recap prose never
// matches. Handles "vs", "vs.", "v.", "VS".
const MATCHUP = /^(.{2,45}?)\s+(?:vs\.?|v\.|VS)\s+(.{2,45}?)(?:\s*[:\-–]?\s*\d{1,3}\s*[-–]\s*\d{1,3})?$/i;

function isHeader(b) {
  if (/©|designed by/i.test(b.text)) return false;       // footer
  if (/^h[2-6]$/.test(b.tag)) return true;                 // any heading = section break
  if (/^Game\s*\d+\s*[:.\-]/i.test(b.text)) return true;   // "Game 3: A vs. B"
  if (b.text.length <= 70 && MATCHUP.test(b.text)) return true; // bold/standalone matchup line
  return false;
}

const matchupOf = (text) => {
  const stripped = text.replace(/^Game\s*\d+\s*[:.\-]\s*/i, "").trim();
  return MATCHUP.test(stripped) ? stripped : (stripped !== text ? stripped : null);
};

// Group ordered blocks into games on header boundaries. Text before the first
// header becomes the opening game (label null).
function parseGames(bs) {
  const games = [];
  let cur = { label: null, matchup: null, text: [] };
  for (const b of bs) {
    if (isHeader(b)) {
      if (cur.text.length || cur.label) games.push(cur);
      cur = { label: b.text, matchup: matchupOf(b.text), text: [] };
    } else {
      cur.text.push(b.text);
    }
  }
  if (cur.text.length || cur.label) games.push(cur);
  return games.map((g) => ({ label: g.label, matchup: g.matchup, text: g.text.join("\n\n") }));
}

async function fetchAllPosts() {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`${API}?per_page=100&page=${page}&_embed=wp:featuredmedia`);
    if (res.status === 400) break; // past the last page
    if (!res.ok) throw new Error(`HTTP ${res.status} on page ${page}`);
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
    const totalPages = parseInt(res.headers.get("x-wp-totalpages") || "1", 10);
    if (page >= totalPages) break;
  }
  return out;
}

async function run() {
  const listOnly = process.argv.includes("--list");
  const posts = await fetchAllPosts();
  console.log(`Fetched ${posts.length} posts.`);

  const recaps = [];
  for (const p of posts) {
    const slug = p.slug || "";
    const type = recapType(slug);
    if (!type) continue;
    const bs = blocks(p.content?.rendered || "");
    const ps = paragraphsOf(bs);
    const games = (type === "recap" || type === "notable-games") ? parseGames(bs) : [{ label: null, matchup: null, text: ps.join("\n\n") }];
    recaps.push({
      id: p.id,
      slug,
      type,
      title: decode(p.title?.rendered || ""),
      date: (p.date || "").slice(0, 10),
      season: ((p.date || "").match(/^(\d{4})/) || [])[1] || null,
      url: p.link,
      image: p._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null,
      excerpt: decode(p.excerpt?.rendered || "").slice(0, 280),
      gameCount: games.filter((g) => g.matchup).length,
      games,
      bodyText: ps.join("\n\n"),
    });
  }
  recaps.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  if (listOnly) {
    for (const r of recaps) console.log(`  [${r.date}] ${r.type.padEnd(13)} ${r.title}  (${r.gameCount} games)`);
    console.log(`\n${recaps.length} recap posts would be captured.`);
    return;
  }

  const out = {
    _README: "Capitol Hoops Summer League game recaps. Auto-scraped from the WordPress REST API via scripts/scrape-recaps.mjs. Each recap carries title/date/url/image, the full body text, and a best-effort per-game breakdown. type: recap | notable-games | takeaways.",
    _source: "https://capitolhoopssummerleague.com",
    _scrapedAt: new Date().toISOString(),
    recaps,
  };
  const outPath = path.join(process.cwd(), "public", "data", "gameRecaps.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
  const byType = recaps.reduce((m, r) => ((m[r.type] = (m[r.type] || 0) + 1), m), {});
  console.log(`Wrote ${recaps.length} recaps → public/data/gameRecaps.json`);
  console.log("By type:", byType);
}

run().catch((e) => { console.error(e.message); process.exit(1); });
