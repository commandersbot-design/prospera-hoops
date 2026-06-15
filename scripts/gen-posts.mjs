// Data-driven social posts → docs/social-posts/  (matches the template pack, 1080x1350)
// Two-font system like the templates: Saira Condensed (condensed DISPLAY — names,
// stat numbers, hero words) + Hanken Grotesk (BODY — header, labels, meta, footer).
// Auto-fills REAL data. Run: node scripts/gen-posts.mjs
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { buildArchetypeCohort, archetypeForPlayer } from "../src/lib/archetype.js";

const OUT = "docs/social-posts";
fs.mkdirSync(OUT, { recursive: true });
const W = 1080, H = 1350;
const C = { bg: "#0B0E13", panel: "#0F141B", line: "rgba(255,255,255,0.08)", orange: "#FF6A1A", text: "#f6f6f4", mut: "#8b929c", faint: "#5a626c" };
const SD = "Saira Condensed", HG = "Hanken Grotesk";
const FONT_SD = (fs.readFileSync("public/brand/svg/prosperahoops-wordmark-dark.svg", "utf8").match(/<style[\s\S]*?<\/style>/) || [""])[0];
const FONT_HG = fs.readFileSync("brand-kit/hanken-embed.svgstyle", "utf8");
const EMBLEM = fs.readFileSync("brand-kit/prospera-emblem.svg", "utf8").replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const r1 = (n) => (isFinite(n) ? (Math.round(n * 10) / 10).toFixed(1) : "—");

const ch = JSON.parse(fs.readFileSync("public/data/capitolHoops.json", "utf8"));
const logs = JSON.parse(fs.readFileSync("public/data/gameLogs.json", "utf8")).players || {};
const prj = JSON.parse(fs.readFileSync("public/data/prospects.json", "utf8"));
const prospects = prj.prospects || prj;
const nameKey = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const cohort = buildArchetypeCohort(logs, ch.teams);
const PR_BY = Object.fromEntries(prospects.map((p) => [p.id, p]));
const canon = (slug, name) => { const m = String(name || "").match(/^(.*?)\s*\(([^)]+)\)\s*$/); if (m) { const b = m[1].trim(), p = m[2].trim(); return /^(VA|MD|DC)$/i.test(p) ? b : p; } return String(name || "").trim(); };

const players = [];
for (const [slug, t] of Object.entries(ch.teams)) for (const pl of (t.players || [])) {
  if (!(pl.stats && pl.stats.gp > 0 && pl.stats.ppg != null)) continue;
  const p = PR_BY[nameKey(pl.name)];
  const arch = archetypeForPlayer(pl.name, cohort, pl.position, t.level || "Summer");
  players.push({
    name: pl.name, key: nameKey(pl.name), school: canon(slug, t.name),
    pos: (p && p.position) || pl.position || null, classYr: p && p.gradYear ? p.gradYear : (pl.classYear || null),
    state: p && p.state || null, headshot: p && p.headshot || null,
    ppg: pl.stats.ppg, rpg: pl.stats.rpg ?? null, apg: pl.stats.apg ?? null, gp: pl.stats.gp,
    arch: arch && arch.label ? arch.label : null,
  });
}
const byPpg = [...players].sort((a, b) => b.ppg - a.ppg);

// --- helpers ---------------------------------------------------------------
const defs = `<defs>${FONT_SD}${FONT_HG}
  <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E1219"/><stop offset="1" stop-color="#080A0E"/></linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.3" r="0.7"><stop offset="0" stop-color="#FF6A1A" stop-opacity="0.08"/><stop offset="1" stop-color="#FF6A1A" stop-opacity="0"/></radialGradient></defs>`;
const bg = `<rect width="${W}" height="${H}" fill="url(#bgGrad)"/><rect width="${W}" height="${H}" fill="url(#glow)"/>`;
const emblemAt = (x, y, s) => `<g transform="translate(${x},${y})"><svg width="${s}" height="${s}" viewBox="0 0 200 200">${EMBLEM}</svg></g>`;
// text: default body (Hanken); pass o.font=SD for condensed display
const T = (x, y, s, w, fill, txt, o = {}) => `<text x="${x}" y="${y}" font-family="${o.font || HG}" font-weight="${w}" font-size="${s}" fill="${fill}"${o.ls ? ` letter-spacing="${o.ls}"` : ""}${o.anchor ? ` text-anchor="${o.anchor}"` : ""}>${txt}</text>`;
const TD = (x, y, s, w, fill, txt, o = {}) => T(x, y, s, w, fill, txt, { ...o, font: SD });
const tag = (xr, y, txt) => { const w = txt.length * 13 + 40; return `<rect x="${xr - w}" y="${y - 27}" width="${w}" height="38" rx="19" fill="none" stroke="${C.orange}" stroke-width="2"/>${T(xr - w / 2, y, 19, 800, C.orange, esc(txt), { ls: 2, anchor: "middle" })}`; };
const header = (tg) => `${emblemAt(40, 38, 64)}
  <text x="120" y="74" font-family="${HG}" font-weight="800" font-size="30"><tspan fill="${C.text}">PROSPERA</tspan><tspan fill="${C.orange}" dx="9">HOOPS</tspan></text>
  ${T(122, 99, 13, 700, C.mut, "DMV HOOPS DATA", { ls: 3 })}
  ${tg ? tag(W - 40, 74, tg) : ""}`;
const footer = () => `<line x1="44" y1="1268" x2="${W - 44}" y2="1268" stroke="${C.line}" stroke-width="1.5"/>
  ${T(44, 1306, 25, 800, C.orange, "ProsperaHoops.com")}
  ${T(W - 44, 1306, 24, 700, C.mut, "@PROSPERAHOOPS", { ls: 1, anchor: "end" })}`;
const frame = (inner, tg) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}${bg}${header(tg)}${inner}${footer()}</svg>`;
const hero = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}${bg}${inner}${footer()}</svg>`;
const pillO = (cx, y, txt, fs = 34) => { const w = txt.length * (fs * 0.5) + 70; return `<rect x="${cx - w / 2}" y="${y - fs - 4}" width="${w}" height="${fs + 24}" rx="${(fs + 24) / 2}" fill="none" stroke="${C.orange}" stroke-width="2"/>${T(cx, y, fs, 700, C.orange, esc(txt), { anchor: "middle" })}`; };
const pillL = (x, y, txt, fs = 25) => { const w = txt.length * (fs * 0.6) + 54; return `<rect x="${x}" y="${y - fs - 3}" width="${w}" height="${fs + 14}" rx="${(fs + 14) / 2}" fill="none" stroke="${C.orange}" stroke-width="2"/>${T(x + w / 2, y, fs, 700, C.orange, esc(txt), { ls: 1, anchor: "middle" })}`; };
const statTrio = (y, items) => items.map((it, i) => { const cx = [232, 540, 848][i]; return `${TD(cx, y, 100, 800, it.hot ? C.orange : C.text, esc(it.v), { anchor: "middle" })}${T(cx, y + 50, 26, 800, C.mut, esc(it.l), { ls: 3, anchor: "middle" })}`; }).join("");
const write = (svg, f) => sharp(Buffer.from(svg)).png().toFile(path.join(OUT, f));

async function run() {
  const teams = Object.keys(ch.teams).length, nPlayers = prospects.length;

  // LIVE
  await write(hero(`${emblemAt(W / 2 - 90, 120, 180)}
    ${TD(W / 2, 480, 168, 800, C.text, "WE'RE", { anchor: "middle" })}
    ${TD(W / 2, 620, 168, 800, C.orange, "LIVE", { anchor: "middle" })}
    <line x1="200" y1="720" x2="${W - 200}" y2="720" stroke="${C.line}" stroke-width="1.5"/>
    ${statTrio(840, [{ v: `${Math.floor(teams / 10) * 10}+`, l: "SUMMER TEAMS", hot: true }, { v: `${Math.floor(nPlayers / 100) * 100}+`, l: "PLAYERS", hot: true }, { v: "1", l: "DMV HOME", hot: true }])}
    ${pillO(W / 2, 1010, "ProsperaHoops.com", 38)}
    ${T(W / 2, 1110, 30, 600, C.mut, "Find your player. Claim your profile.", { anchor: "middle" })}`), "live.png");

  // TEASER
  await write(hero(`${emblemAt(W / 2 - 80, 150, 160)}
    ${T(W / 2, 430, 25, 800, C.orange, "THE DMV'S SCOUTING SYSTEM OF RECORD", { ls: 2, anchor: "middle" })}
    ${TD(W / 2, 660, 210, 800, C.text, "DROPS", { anchor: "middle" })}
    ${TD(W / 2, 830, 160, 800, C.orange, "THURSDAY", { anchor: "middle" })}
    ${T(W / 2, 930, 32, 600, C.mut, "Every DMV hooper — tracked. Real stats. Free.", { anchor: "middle" })}
    ${pillO(W / 2, 1090, "ProsperaHoops.com", 38)}`), "teaser.png");

  // CLAIM
  await write(frame(`${T(W / 2, 380, 25, 800, C.orange, "FREE · 2 MINUTES", { ls: 3, anchor: "middle" })}
    ${TD(W / 2, 560, 140, 800, C.text, "CLAIM YOUR", { anchor: "middle" })}
    ${TD(W / 2, 700, 140, 800, C.orange, "PROFILE", { anchor: "middle" })}
    ${T(W / 2, 800, 32, 600, C.mut, "Real stats. Honest evals. Your recruiting home.", { anchor: "middle" })}
    ${T(W / 2, 850, 30, 600, C.mut, "First 100 DMV players = permanent Founding Player.", { anchor: "middle" })}
    ${pillO(W / 2, 1040, "ProsperaHoops.com", 40)}`, "CLAIM"), "claim.png");

  // TOP 5 SCORERS
  const top5 = byPpg.slice(0, 5);
  const rows = top5.map((p, i) => { const y = 400 + i * 148; return `<line x1="64" y1="${y + 66}" x2="${W - 64}" y2="${y + 66}" stroke="${C.line}" stroke-width="1"/>
    ${TD(82, y + 40, 70, 800, C.orange, String(i + 1))}
    ${T(196, y + 22, 44, 800, C.text, esc(p.name))}
    ${T(198, y + 60, 24, 600, C.mut, esc(`${p.pos || ""}${p.classYr ? " · '" + String(p.classYr).slice(2) : ""} · ${p.school}`))}
    ${TD(W - 80, y + 46, 70, 800, C.text, r1(p.ppg), { anchor: "end" })}`; }).join("");
  await write(frame(`${TD(64, 250, 86, 800, C.text, "TOP 5 SCORERS")}${T(64, 296, 26, 700, C.mut, "CAPITOL HOOPS SUMMER LEAGUE · 2+ GP", { ls: 2 })}${rows}${T(64, 1210, 24, 500, C.faint, "Summer-league averages. HS production weighs more.")}`, "LEADERS"), "top5.png");

  // SPOTLIGHT + STATDROP for the top scorer (sample)
  for (const p of byPpg.slice(0, 1)) {
    const meta = [p.pos, p.classYr ? "CLASS OF " + p.classYr : null, `${p.school}${p.state ? " (" + p.state + ")" : ""}`].filter(Boolean).join("  ·  ").toUpperCase();
    await write(frame(`<rect x="64" y="150" width="${W - 128}" height="560" rx="22" fill="${C.panel}" stroke="${C.line}" stroke-width="1.5"/>
      ${p.headshot ? `<clipPath id="ph"><rect x="64" y="150" width="${W - 128}" height="560" rx="22"/></clipPath><image href="${p.headshot}" x="64" y="150" width="${W - 128}" height="560" preserveAspectRatio="xMidYMid slice" clip-path="url(#ph)"/>` : T(W / 2, 445, 42, 700, C.faint, "PHOTO", { ls: 8, anchor: "middle" })}
      ${TD(64, 800, 104, 800, C.text, esc(p.name.toUpperCase()))}
      ${p.arch ? pillL(64, 858, p.arch.toUpperCase()) : ""}
      ${T(64, 928, 28, 700, C.mut, esc(meta), { ls: 1 })}
      ${statTrio(1095, [{ v: r1(p.ppg), l: "PPG", hot: true }, { v: r1(p.rpg), l: "RPG" }, { v: r1(p.apg), l: "APG" }])}`, "SPOTLIGHT"), `spotlight-${p.key}.png`);

    await write(frame(`${T(W / 2, 380, 28, 800, C.orange, "STAT DROP", { ls: 4, anchor: "middle" })}
      ${TD(W / 2, 700, 320, 800, C.orange, r1(p.ppg), { anchor: "middle" })}
      ${T(W / 2, 770, 36, 800, C.mut, "POINTS PER GAME", { ls: 5, anchor: "middle" })}
      ${TD(W / 2, 930, 92, 800, C.text, esc(p.name.toUpperCase()), { anchor: "middle" })}
      ${T(W / 2, 985, 28, 600, C.mut, esc(`${p.pos || ""} · ${p.school} · ${p.gp} GP`.toUpperCase()), { ls: 1, anchor: "middle" })}`, "STAT DROP"), `statdrop-${p.key}.png`);
  }
  console.log(`posts → ${OUT}/: live, teaser, claim, top5, spotlight + statdrop (${byPpg[0]?.name}). ${players.length} players.`);
}
run();
