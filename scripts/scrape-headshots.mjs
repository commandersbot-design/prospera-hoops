// Scrape player headshots from Capitol Hoops player pages (/player/<slug>/) for
// every player who has a game log. Each page's non-logo wp-content/uploads image
// is the player photo. Downloads → public/headshots/<key>.jpg (square, top-cover)
// and writes a manifest → public/data/headshots.json keyed by nameKey.
// Resumable: existing files are skipped. Run: node scripts/scrape-headshots.mjs
import sharp from "sharp";
import fs from "fs";
import path from "path";

const nameKey = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const HEAD_DIR = path.join("public", "headshots");
const MANIFEST = path.join("public", "data", "headshots.json");
fs.mkdirSync(HEAD_DIR, { recursive: true });

const logs = JSON.parse(fs.readFileSync("public/data/gameLogs.json", "utf8")).players || {};
const entries = Object.entries(logs).filter(([, v]) => v.slug); // need a player-page slug
const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : {};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let got = 0, skip = 0, miss = 0, err = 0;

for (const [key, rec] of entries) {
  const out = path.join(HEAD_DIR, `${key}.jpg`);
  if (fs.existsSync(out)) { manifest[key] = `/headshots/${key}.jpg`; skip++; continue; }
  try {
    const r = await fetch(`https://capitolhoopssummerleague.com/player/${rec.slug}/`, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) { miss++; continue; }
    const html = await r.text();
    const imgs = [...new Set([...html.matchAll(/https:\/\/capitolhoopssummerleague\.com\/wp-content\/uploads\/[^"'\)\s]+\.(?:jpg|jpeg|png|webp)/gi)].map((m) => m[0]))];
    const shot = imgs.find((u) => !/logo|favicon|cropped|sponsor/i.test(u));
    if (!shot) { miss++; continue; }
    const ir = await fetch(shot, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!ir.ok) { miss++; continue; }
    const buf = Buffer.from(await ir.arrayBuffer());
    await sharp(buf).resize(600, 600, { fit: "cover", position: "top" }).jpeg({ quality: 88 }).toFile(out);
    manifest[key] = `/headshots/${key}.jpg`;
    got++;
    if (got % 25 === 0) { fs.writeFileSync(MANIFEST, JSON.stringify(manifest)); console.log(`  …${got} new, ${skip} skipped, ${miss} no-photo`); }
    await sleep(120);
  } catch (e) { err++; }
}
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, Object.keys(manifest).sort(), 0));
console.log(`\nDone. ${got} new, ${skip} existing, ${miss} no-photo, ${err} errors. Manifest: ${Object.keys(manifest).length} players → ${MANIFEST}`);
