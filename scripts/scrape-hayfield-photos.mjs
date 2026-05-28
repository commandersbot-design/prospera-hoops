// Scrape Capitol Hoops player photos for a team and attach them as prospect
// headshots. Downloads each photo into public/headshots/ (self-hosted, so the
// site doesn't hot-link an external host) and sets prospect.headshot to the
// local path for matching players at the target school.
//
// Defaults to Hayfield. Reusable for other teams by passing args:
//   node scripts/scrape-hayfield-photos.mjs <team-slug> "<School Name>"
//   node scripts/scrape-hayfield-photos.mjs                 (Hayfield defaults)

import fs from "fs";
import path from "path";

const TEAM_SLUG = process.argv[2] || "hawks-hayfield";
const SCHOOL_NAME = process.argv[3] || "Hayfield Secondary";

const root = process.cwd();
const prospectsPath = path.join(root, "public", "data", "prospects.json");
const outDir = path.join(root, "public", "headshots");

const UA = "Mozilla/5.0 prospera-preps (DMV HS recruiting site, photo ingest)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nameKey = (n) => String(n || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const decode = (s) =>
  String(s || "")
    .replace(/&#8211;/g, "–").replace(/&#8217;/g, "'").replace(/&#039;|&#39;/g, "'")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();

async function getHtml(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

// First wp-content/uploads image that isn't the Capitol Hoops logo = the headshot.
function photoUrl(html) {
  const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']*wp-content\/uploads[^"']+)["']/gi)]
    .map((m) => m[1])
    .filter((u) => !/logooutline|CapitolHoopsSL/i.test(u));
  return imgs[0] || null;
}

function playerName(html) {
  const t = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || "";
  return decode(t.split(/&#8211;|–|\|/)[0]);
}

const main = async () => {
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`Scraping ${TEAM_SLUG} → ${SCHOOL_NAME}`);

  const teamHtml = await getHtml(`https://capitolhoopssummerleague.com/team/${TEAM_SLUG}/`);
  const slugs = [...new Set(
    [...teamHtml.matchAll(/href=["']https:\/\/capitolhoopssummerleague\.com\/player\/([^\/"']+)\/["']/gi)].map((m) => m[1])
  )];
  console.log(`Found ${slugs.length} player pages.`);

  const byNameKey = {}; // nameKey -> local headshot path
  for (const slug of slugs) {
    try {
      const html = await getHtml(`https://capitolhoopssummerleague.com/player/${slug}/`);
      const name = playerName(html);
      const url = photoUrl(html);
      if (!name || !url) { console.log(`  ✗ ${slug}: ${!name ? "no name" : "no photo"}`); await sleep(400); continue; }
      const ext = (url.match(/\.(png|jpe?g|webp)(?:\?|$)/i) || [, "png"])[1].toLowerCase();
      const fname = `${nameKey(name)}.${ext}`;
      const buf = Buffer.from(await (await fetch(url, { headers: { "User-Agent": UA } })).arrayBuffer());
      fs.writeFileSync(path.join(outDir, fname), buf);
      byNameKey[nameKey(name)] = `/headshots/${fname}`;
      console.log(`  ✓ ${name} → ${fname} (${(buf.length / 1024).toFixed(0)}kb)`);
    } catch (e) {
      console.log(`  ✗ ${slug}: ${e.message}`);
    }
    await sleep(450);
  }

  // Attach to matching prospects at the target school.
  const file = JSON.parse(fs.readFileSync(prospectsPath, "utf8"));
  let set = 0;
  const unmatchedPhotos = new Set(Object.keys(byNameKey));
  for (const p of file.prospects) {
    if (p.school !== SCHOOL_NAME) continue;
    const hit = byNameKey[nameKey(p.name)];
    if (hit) { p.headshot = hit; set++; unmatchedPhotos.delete(nameKey(p.name)); }
  }
  fs.writeFileSync(prospectsPath, JSON.stringify(file, null, 2) + "\n");

  console.log(`\nDownloaded ${Object.keys(byNameKey).length} photos · attached to ${set} ${SCHOOL_NAME} prospects.`);
  if (unmatchedPhotos.size) console.log(`Photos with no matching prospect (likely dropped/graduated): ${[...unmatchedPhotos].join(", ")}`);
};

main();
