// Post-build: write a static HTML page per player at dist/player/<key>/index.html
// with the right og:image / title so shared /player/<key> links preview the
// player's trading card (crawlers don't run JS, so the SPA's single index.html
// can't do this). Each page still loads the SPA, which reads the path and opens
// the player. Run after `vite build` (wired into npm run build).
import fs from "fs";
import path from "path";

const SITE = (process.env.SITE_URL || "https://prospera-preps.vercel.app").replace(/\/$/, "");
const nameKey = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const indexPath = path.join("dist", "index.html");
if (!fs.existsSync(indexPath)) { console.error("dist/index.html not found — run after `vite build`."); process.exit(1); }
const base = fs.readFileSync(indexPath, "utf8");

const pr = JSON.parse(fs.readFileSync("public/data/prospects.json", "utf8"));
const prospects = Array.isArray(pr) ? pr : (pr.prospects || []);
const haveCard = (key) => fs.existsSync(path.join("public", "og", "players", `${key}.png`));
const DEFAULT_IMG = `${SITE}/brand/png/prosperahoops-lockup-dark-1600w.png`;

function pageFor(name, key) {
  const img = haveCard(key) ? `${SITE}/og/players/${key}.png` : DEFAULT_IMG;
  const title = `${name} · Prospera Hoops`;
  const desc = `${name} — DMV scouting profile: stats, role, and development, tracked on Prospera Hoops.`;
  const url = `${SITE}/player/${key}`;
  let html = base;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  html = html.replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(title)}" />`);
  html = html.replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(desc)}" />`);
  html = html.replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${img}" />`);
  html = html.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(desc)}" />`);
  // add og:url + twitter:image (after the twitter:card line)
  html = html.replace(/<meta name="twitter:card"[^>]*>/, `$&\n    <meta name="twitter:image" content="${img}" />\n    <meta property="og:url" content="${url}" />`);
  return html;
}

let n = 0;
const seen = new Set();
for (const p of prospects) {
  const key = nameKey(p.name);
  if (!key || seen.has(key)) continue;
  seen.add(key);
  const dir = path.join("dist", "player", key);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), pageFor(p.name, key));
  n++;
}
console.log(`prerender-og: ${n} player pages → dist/player/<key>/index.html  (with cards: ${[...seen].filter(haveCard).length})`);
