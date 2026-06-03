// Build src/data/schedule.json by scraping the LIVE Capitol Hoops 2026
// summer-league schedule page (no more manual paste).
//
// Source: https://capitolhoopssummerleague.com/schedule/
// The page is SportsPress (WordPress). The whole slate lives in one
// `sp-event-list` table, one <tr> per game, with per-cell data-label
// attributes that make extraction deterministic:
//   [Date]         <date>2026-05-18 17:00:00</date>May 18, 2026
//   [Game]         Home vs Away          (home team is always listed first)
//   [Time/Results] "91 - 69" for a final, otherwise the tip-off time
//   [Court]        Dematha-Court 1
//
// Output schema is unchanged from the old paste-based builder, so the UI
// (src/App.jsx) keeps reading it as-is.
//
// Usage:
//   node scripts/build-schedule.mjs             # scrape, write file
//   node scripts/build-schedule.mjs --validate  # scrape, print summary, no write
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEDULE_URL = "https://capitolhoopssummerleague.com/schedule/";

const decode = (s) => String(s || "")
  .replace(/&#8211;/g, "–").replace(/&#8217;/g, "'").replace(/&#039;/g, "'").replace(/&#39;/g, "'")
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

const stripTags = (html) => decode(String(html || "").replace(/<[^>]+>/g, " "));

// "19:30:00" -> "7:30 pm"  ·  "10:00:00" -> "10:00 am"
function formatTime(hhmmss) {
  const m = String(hhmmss || "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  let hr = +m[1];
  const ampm = hr >= 12 ? "pm" : "am";
  hr = hr % 12 || 12;
  return `${hr}:${m[2]} ${ampm}`;
}

function parseRows(tableHtml) {
  return [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((tr) => {
    const cells = {};
    for (const c of tr[1].matchAll(/<td[^>]*data-label="([^"]*)"[^>]*>([\s\S]*?)<\/td>/g)) cells[c[1]] = c[2];
    return cells;
  }).filter((c) => c.Date && c.Game); // drop the header row (no data-label tds)
}

function toGame(cells) {
  const dt = (cells.Date.match(/<date>([\s\S]*?)<\/date>/) || [])[1] || "";
  const iso = (dt.match(/^(\d{4}-\d{2}-\d{2})/) || [])[1];
  const timeOfDay = formatTime((dt.split(/\s+/)[1]) || "");
  // The label text after the <date> element, e.g. "May 18, 2026".
  const dateLabel = stripTags(cells.Date.replace(/<date>[\s\S]*?<\/date>/, "")) || iso;

  const matchup = stripTags(cells.Game);
  const sides = matchup.split(/\s+vs\.?\s+/i);
  if (!iso || sides.length !== 2) { console.warn("Skipping unparseable row:", JSON.stringify({ iso, matchup })); return null; }

  const tr = stripTags(cells["Time/Results"]);
  const scoreM = tr.match(/(\d{1,3})\s*[-–]\s*(\d{1,3})/);
  const isFinal = !!scoreM;

  return {
    date: iso,
    dateLabel,
    home: sides[0].trim(),
    away: sides[1].trim(),
    homeScore: isFinal ? +scoreM[1] : null,
    awayScore: isFinal ? +scoreM[2] : null,
    time: isFinal ? null : timeOfDay,
    court: stripTags(cells.Court) || null,
    status: isFinal ? "final" : "scheduled",
  };
}

async function run() {
  const validate = process.argv.includes("--validate");
  const res = await fetch(SCHEDULE_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${SCHEDULE_URL}`);
  const html = await res.text();

  const tableM = html.match(/<table class="[^"]*sp-event-list[^"]*"[^>]*>[\s\S]*?<\/table>/);
  if (!tableM) throw new Error("Could not find the sp-event-list schedule table — page markup may have changed.");

  const games = parseRows(tableM[0]).map(toGame).filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""));

  const finals = games.filter((g) => g.status === "final").length;
  const out = { season: "2026", source: "Capitol Hoops Summer League", sourceUrl: SCHEDULE_URL, scrapedAt: new Date().toISOString(), games };

  if (validate) {
    console.log(`Scraped ${games.length} games (${finals} final, ${games.length - finals} scheduled).`);
    console.log("Date range:", games[0]?.date, "→", games[games.length - 1]?.date);
    console.log("\nFirst 3:");
    games.slice(0, 3).forEach((g) => console.log(" ", JSON.stringify(g)));
    return;
  }

  const dest = join(__dirname, "..", "src", "data", "schedule.json");
  writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote ${games.length} games (${finals} final, ${games.length - finals} scheduled) -> ${dest}`);
}

run().catch((e) => { console.error(e.message); process.exit(1); });
