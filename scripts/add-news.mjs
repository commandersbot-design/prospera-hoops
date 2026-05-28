// Add a news item to the Live Wire ticker (src/data/news.json).
//
// The ticker auto-includes commitments + top summer performers; this manages
// the hand-authored stream layered on top — offers, transfers, breaking
// recruiting news, announcements.
//
// Usage:
//   node scripts/add-news.mjs "Isaiah Martin picks up a Maryland offer" --prospect isaiahmartin
//   node scripts/add-news.mjs "WCAC tournament bracket released" --url https://example.com/bracket
//   node scripts/add-news.mjs "General DMV recruiting note"
//
// Flags:
//   --prospect <id>   link the item to a prospect profile (validated — aborts
//                     if the id isn't in the database, to avoid dead links)
//   --url <url>       link the item to an external URL (used when no prospect)
//   --date <YYYY-MM-DD>  override the date (defaults to today)

import fs from "fs";
import path from "path";

const root = process.cwd();
const newsPath = path.join(root, "src", "data", "news.json");
const prospectsPath = path.join(root, "public", "data", "prospects.json");

const args = process.argv.slice(2);
let headline = null, prospect = null, url = null, date = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--prospect") prospect = args[++i];
  else if (args[i] === "--url") url = args[++i];
  else if (args[i] === "--date") date = args[++i];
  else if (!headline) headline = args[i];
}

if (!headline) {
  console.error('usage: node scripts/add-news.mjs "<headline>" [--prospect <id>] [--url <url>] [--date YYYY-MM-DD]');
  process.exit(2);
}

if (prospect) {
  const prospects = JSON.parse(fs.readFileSync(prospectsPath, "utf8")).prospects || [];
  const match = prospects.find((p) => p.id === prospect);
  if (!match) {
    console.error(`prospect id "${prospect}" not found in public/data/prospects.json — aborting to avoid a dead link.`);
    console.error("Tip: the id is the lowercase-alphanumeric slug of the name (e.g. \"isaiahmartin\").");
    process.exit(1);
  }
  console.log(`linked to: ${match.name} (${match.school})`);
}

const news = JSON.parse(fs.readFileSync(newsPath, "utf8"));
news.items = news.items || [];
const item = { headline, prospectId: prospect || null, url: url || null, date: date || new Date().toISOString().slice(0, 10) };
news.items.unshift(item);
fs.writeFileSync(newsPath, JSON.stringify(news, null, 2) + "\n");

console.log(`Added (${item.date}): ${headline}`);
console.log(`Total hand-authored items: ${news.items.length}`);
console.log("Commit + push to deploy the updated ticker.");
