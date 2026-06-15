// Data-driven social posts → docs/social-posts/  (matches the template pack, 1080x1350)
// Recreates the locked template frame + auto-fills REAL data from the site.
// Templates: live, teaser, claim, top5, spotlight-<key>, statdrop-<key>.
// Run: node scripts/gen-posts.mjs
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { buildArchetypeCohort, archetypeForPlayer } from "../src/lib/archetype.js";

const OUT = "docs/social-posts";
fs.mkdirSync(OUT, { recursive: true });
const W = 1080, H = 1350;
const C = { bg: "#0B0E13", panel: "#12161C", line: "rgba(255,255,255,0.08)", orange: "#FF6A1A", text: "#f6f6f4", mut: "#8b929c", faint: "#5a626c" };
const SA = "Saira";
const FONT = fs.readFileSync("brand-kit/saira-embed.svgstyle", "utf8");
const EMBLEM = fs.readFileSync("brand-kit/prospera-emblem.svg", "utf8").replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const r1 = (n) => (isFinite(n) ? (Math.round(n * 10) / 10).toFixed(1) : "—");

// data
const ch = JSON.parse(fs.readFileSync("public/data/capitolHoops.json", "utf8"));
const logs = JSON.parse(fs.readFileSync("public/data/gameLogs.json", "utf8")).players || {};
const pr = JSON.parse(fs.readFileSync("public/data/prospects.json", "utf8"));
const prospects = pr.prospects || pr;
const nameKey = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const cohort = buildArchetypeCohort(logs, ch.teams);
const PR_BY = Object.fromEntries(prospects.map((p) => [p.id, p]));
const canon = (slug, name) => { const m = String(name || "").match(/^(.*?)\s*\(([^)]+)\)\s*$/); if (m) { const b = m[1].trim(), p = m[2].trim(); return /^(VA|MD|DC)$/i.test(p) ? b : p; } return String(name || "").trim(); };

// all rostered players with summer stats + their prospect identity
const players = [];
for (const [slug, t] of Object.entries(ch.teams)) for (const pl of (t.pl || t.players || [])) {
  if (!(pl.stats && pl.stats.gp > 0 && pl.stats.ppg != null)) continue;
  const p = PR_BY[nameKey(pl.name)];
  const arch = archetypeForPlayer(pl.name, cohort, pl.position, t.level || "Summer");
  players.push({
    name: pl.name, key: nameKey(pl.name), team: t.name, school: canon(slug, t.name),
    pos: (p && p.position) || pl.position || null, classYr: p && p.gradYear ? p.gradYear : (pl.classYear || null),
    state: p && p.state || null, headshot: p && p.headshot || null,
    ppg: pl.stats.ppg, rpg: pl.stats.rpg ?? null, apg: pl.stats.apg ?? null, gp: pl.stats.gp,
    arch: arch && arch.label ? arch.label : null,
  });
}
const byPpg = [...players].sort((a, b) => b.ppg - a.ppg);

// --- shared frame ----------------------------------------------------------
const defs = `<defs>${FONT}
  <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E1219"/><stop offset="1" stop-color="#080A0E"/></linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.3" r="0.7"><stop offset="0" stop-color="#FF6A1A" stop-opacity="0.10"/><stop offset="1" stop-color="#FF6A1A" stop-opacity="0"/></radialGradient></defs>`;
const bg = `<rect width="${W}" height="${H}" fill="url(#bgGrad)"/><rect width="${W}" height="${H}" fill="url(#glow)"/>`;
const emblemAt = (x, y, s) => `<g transform="translate(${x},${y})"><svg width="${s}" height="${s}" viewBox="0 0 200 200">${EMBLEM}</svg></g>`;
const T = (x, y, s, w, fill, txt, opts = {}) => `<text x="${x}" y="${y}" font-family='${SA}' font-weight="${w}" font-size="${s}" fill="${fill}"${opts.ls ? ` letter-spacing="${opts.ls}"` : ""}${opts.anchor ? ` text-anchor="${opts.anchor}"` : ""}>${txt}</text>`;
const tag = (cxRight, y, txt) => { const w = txt.length * 15 + 44; return `<rect x="${cxRight - w}" y="${y - 26}" width="${w}" height="40" rx="20" fill="none" stroke="${C.orange}" stroke-width="2"/>${T(cxRight - w / 2, y, 20, 800, C.orange, esc(txt), { ls: 2, anchor: "middle" })}`; };
const header = (tagTxt) => `${emblemAt(40, 38, 64)}
  <text x="120" y="76" font-family='${SA}' font-weight="900" font-size="32"><tspan fill="${C.text}">PROSPERA</tspan><tspan fill="${C.orange}" dx="11">HOOPS</tspan></text>
  ${T(122, 100, 14, 700, C.mut, "DMV HOOPS DATA", { ls: 3 })}
  ${tagTxt ? tag(W - 40, 76, tagTxt) : ""}`;
const footer = () => `<line x1="44" y1="1268" x2="${W - 44}" y2="1268" stroke="${C.line}" stroke-width="1.5"/>
  ${T(44, 1306, 26, 800, C.orange, "ProsperaHoops.com")}
  ${T(W - 44, 1306, 26, 800, C.mut, "@PROSPERAHOOPS", { ls: 1, anchor: "end" })}`;
const frame = (inner, tagTxt) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}${bg}${header(tagTxt)}${inner}${footer()}</svg>`;
const pillOutline = (cx, y, txt, fs = 34) => { const w = txt.length * (fs * 0.56) + 80; return `<rect x="${cx - w / 2}" y="${y - fs - 6}" width="${w}" height="${fs + 26}" rx="${(fs + 26) / 2}" fill="none" stroke="${C.orange}" stroke-width="2"/>${T(cx, y, fs, 800, C.orange, esc(txt), { anchor: "middle" })}`; };
const write = (svg, file) => sharp(Buffer.from(svg)).png().toFile(path.join(OUT, file));

// 3-stat row (cx centers, big number + label)
const statRow = (y, items) => items.map((it, i) => { const cx = [230, 540, 850][i]; return `${T(cx, y, 96, 900, it.hot ? C.orange : C.text, esc(it.v), { anchor: "middle" })}${T(cx, y + 56, 28, 800, C.mut, esc(it.l), { ls: 2, anchor: "middle" })}`; }).join("");

async function run() {
  // LIVE (hero, no top tag)
  const teams = Object.keys(ch.teams).length, nPlayers = prospects.length;
  const liveInner = `${emblemAt(W / 2 - 90, 120, 180)}
    ${T(W / 2, 470, 150, 900, C.text, "WE'RE", { anchor: "middle" })}
    ${T(W / 2, 600, 150, 900, C.orange, "LIVE", { anchor: "middle" })}
    <line x1="180" y1="700" x2="${W - 180}" y2="700" stroke="${C.line}" stroke-width="1.5"/>
    ${statRow(830, [{ v: `${Math.floor(teams / 10) * 10}+`, l: "SUMMER TEAMS", hot: true }, { v: `${Math.floor(nPlayers / 100) * 100}+`, l: "PLAYERS", hot: true }, { v: "1", l: "DMV HOME", hot: true }])}
    ${pillOutline(W / 2, 1000, "ProsperaHoops.com", 38)}
    ${T(W / 2, 1110, 32, 700, C.mut, "Find your player. Claim your profile.", { anchor: "middle" })}`;
  await write(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}${bg}${liveInner}${footer()}</svg>`, "live.png");

  // TEASER (hero)
  const teaserInner = `${emblemAt(W / 2 - 80, 150, 160)}
    ${T(W / 2, 430, 26, 800, C.orange, "THE DMV'S SCOUTING SYSTEM OF RECORD", { ls: 3, anchor: "middle" })}
    ${T(W / 2, 640, 200, 900, C.text, "DROPS", { anchor: "middle" })}
    ${T(W / 2, 800, 150, 900, C.orange, "THURSDAY", { anchor: "middle" })}
    ${T(W / 2, 920, 34, 700, C.mut, "Every DMV hooper — tracked. Real stats. Free.", { anchor: "middle" })}
    ${pillOutline(W / 2, 1080, "ProsperaHoops.com", 38)}`;
  await write(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}${bg}${teaserInner}${footer()}</svg>`, "teaser.png");

  // CLAIM
  const claimInner = `${T(W / 2, 360, 26, 800, C.orange, "FREE · 2 MINUTES", { ls: 3, anchor: "middle" })}
    ${T(W / 2, 520, 120, 900, C.text, "CLAIM YOUR", { anchor: "middle" })}
    ${T(W / 2, 650, 120, 900, C.orange, "PROFILE", { anchor: "middle" })}
    ${T(W / 2, 760, 34, 700, C.mut, "Real stats. Honest evals. Your recruiting home.", { anchor: "middle" })}
    ${T(W / 2, 815, 32, 700, C.mut, "First 100 DMV players = permanent Founding Player.", { anchor: "middle" })}
    ${pillOutline(W / 2, 1010, "ProsperaHoops.com", 40)}`;
  await write(frame(claimInner, "CLAIM"), "claim.png");

  // TOP 5 SCORERS
  const top5 = byPpg.slice(0, 5);
  const rows = top5.map((p, i) => { const y = 380 + i * 150; return `<line x1="64" y1="${y + 70}" x2="${W - 64}" y2="${y + 70}" stroke="${C.line}" stroke-width="1"/>
    ${T(80, y + 42, 64, 900, C.orange, String(i + 1))}
    ${T(190, y + 28, 46, 800, C.text, esc(p.name))}
    ${T(190, y + 66, 26, 700, C.mut, esc(`${p.pos || ""}${p.classYr ? " · '" + String(p.classYr).slice(2) : ""} · ${p.school}`))}
    ${T(W - 80, y + 42, 60, 900, C.text, r1(p.ppg), { anchor: "end" })}`; }).join("");
  const top5Inner = `${T(64, 230, 70, 900, C.text, "TOP 5 SCORERS")}${T(64, 285, 28, 700, C.mut, "CAPITOL HOOPS SUMMER LEAGUE · 2+ GP", { ls: 2 })}${rows}${T(64, 1210, 26, 700, C.faint, "Summer-league averages. HS production weighs more.")}`;
  await write(frame(top5Inner, "LEADERS"), "top5.png");

  // SPOTLIGHT + STATDROP for the top scorer (sample)
  for (const p of byPpg.slice(0, 1)) {
    const spotInner = `<rect x="64" y="150" width="${W - 128}" height="560" rx="20" fill="#0F141B" stroke="${C.line}" stroke-width="1.5"/>
      ${p.headshot ? `<clipPath id="ph"><rect x="64" y="150" width="${W - 128}" height="560" rx="20"/></clipPath><image href="${p.headshot}" x="64" y="150" width="${W - 128}" height="560" preserveAspectRatio="xMidYMid slice" clip-path="url(#ph)"/>` : T(W / 2, 445, 44, 800, C.faint, "PHOTO", { ls: 6, anchor: "middle" })}
      ${T(64, 800, 92, 900, C.text, esc(p.name.toUpperCase()))}
      ${p.arch ? `${pillOutlineLeft(120, 856, p.arch.toUpperCase())}` : ""}
      ${T(64, 925, 30, 800, C.mut, esc([p.pos, p.classYr ? "CLASS OF " + p.classYr : null, `${p.school}${p.state ? " (" + p.state + ")" : ""}`].filter(Boolean).join(" · ").toUpperCase()), { ls: 1 })}
      ${statRow(1090, [{ v: r1(p.ppg), l: "PPG", hot: true }, { v: r1(p.rpg), l: "RPG" }, { v: r1(p.apg), l: "APG" }])}`;
    await write(frame(spotInner, "SPOTLIGHT"), `spotlight-${p.key}.png`);

    const dropInner = `${T(W / 2, 360, 30, 800, C.orange, "STAT DROP", { ls: 4, anchor: "middle" })}
      ${T(W / 2, 640, 280, 900, C.orange, r1(p.ppg), { anchor: "middle" })}
      ${T(W / 2, 720, 40, 800, C.mut, "POINTS PER GAME", { ls: 4, anchor: "middle" })}
      ${T(W / 2, 880, 70, 900, C.text, esc(p.name.toUpperCase()), { anchor: "middle" })}
      ${T(W / 2, 940, 30, 700, C.mut, esc(`${p.pos || ""} · ${p.school} · ${p.gp} GP`.toUpperCase()), { ls: 1, anchor: "middle" })}`;
    await write(frame(dropInner, "STAT DROP"), `statdrop-${p.key}.png`);
  }
  console.log(`posts → ${OUT}/: live, teaser, claim, top5, spotlight + statdrop (${byPpg[0]?.name}). ${players.length} players available.`);
}
// left-anchored outline pill (for archetype under the name)
function pillOutlineLeft(x, y, txt, fs = 26) { const w = txt.length * (fs * 0.64) + 52; return `<rect x="${x - 4}" y="${y - fs - 4}" width="${w}" height="${fs + 16}" rx="${(fs + 16) / 2}" fill="none" stroke="${C.orange}" stroke-width="2"/>${T(x - 4 + w / 2, y, fs, 800, C.orange, esc(txt), { ls: 1, anchor: "middle" })}`; }
run();
