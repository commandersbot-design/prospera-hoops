// Launch-day social set (Thu 6/18) — WE'RE LIVE drop @ 5pm EST + a "how it
// works" carousel + the HOME story (SEEN · TRACKED · HOME finale). Same brand
// pipeline as gen-launch-eve.mjs: 1080×1350 feed, 1080×1920 story, Oswald +
// Hanken embedded fonts, emblem, Resvg.  Run: node scripts/gen-launch-day.mjs
import { Resvg } from "@resvg/resvg-js";
import fs from "fs";
import path from "path";

const OUT = "docs/social-posts";
fs.mkdirSync(OUT, { recursive: true });
const W = 1080, H = 1350, SW = 1080, SH = 1920;
const C = { bg: "#0B0E13", panel: "#0F141B", line: "rgba(255,255,255,0.08)", orange: "#FF6A1A", text: "#f6f6f4", mut: "#8b929c", faint: "#5a626c", teal: "#2FBF8F", blue: "#3B9EFF" };
const SD = "Oswald", HG = "Hanken Grotesk";
const ttfBufs = (p) => [...fs.readFileSync(p, "utf8").matchAll(/base64,([A-Za-z0-9+/=]+)\)/g)].map((m) => Buffer.from(m[1], "base64"));
const FONTS = [...ttfBufs("brand-kit/oswald-embed.svgstyle"), ...ttfBufs("brand-kit/hanken-embed.svgstyle")];
const FONT_SD = fs.readFileSync("brand-kit/oswald-embed.svgstyle", "utf8");
const FONT_HG = fs.readFileSync("brand-kit/hanken-embed.svgstyle", "utf8");
const renderPng = (svg) => new Resvg(svg, { font: { fontBuffers: FONTS, defaultFontFamily: "Hanken Grotesk", loadSystemFonts: false } }).render().asPng();
const EMBLEM = fs.readFileSync("brand-kit/prospera-emblem.svg", "utf8").replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const T = (x, y, s, w, fill, txt, o = {}) => `<text x="${x}" y="${y}" font-family="${o.font || HG}" font-weight="${w}" font-size="${s}" fill="${fill}"${o.ls ? ` letter-spacing="${o.ls}"` : ""}${o.anchor ? ` text-anchor="${o.anchor}"` : ""}>${txt}</text>`;
const TD = (x, y, s, w, fill, txt, o = {}) => T(x, y, s, w, fill, txt, { ...o, font: SD });
const emblemAt = (x, y, s) => `<g transform="translate(${x},${y})"><svg width="${s}" height="${s}" viewBox="0 0 200 200">${EMBLEM}</svg></g>`;
const defs = `<defs>${FONT_SD}${FONT_HG}
  <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E1219"/><stop offset="1" stop-color="#080A0E"/></linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.26" r="0.7"><stop offset="0" stop-color="${C.orange}" stop-opacity="0.16"/><stop offset="1" stop-color="${C.orange}" stop-opacity="0"/></radialGradient>
  <linearGradient id="band" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FF6A1A"/><stop offset="1" stop-color="#FF8A3D"/></linearGradient></defs>`;
const header = (tag) => `${emblemAt(40, 36, 60)}
  <text x="116" y="70" font-family="${HG}" font-weight="800" font-size="28"><tspan fill="${C.text}">PROSPERA</tspan><tspan fill="${C.orange}" dx="8">HOOPS</tspan></text>
  ${T(118, 94, 12, 700, C.mut, "DMV HOOPS DATA", { ls: 3 })}
  ${tag ? T(W - 40, 70, 18, 700, C.orange, tag, { ls: 2, anchor: "end" }) : ""}`;
const footer = (l = "ProsperaHoops.com", r = "@PROSPERAHOOPS") => `<line x1="44" y1="1276" x2="${W - 44}" y2="1276" stroke="${C.line}" stroke-width="1.5"/>
  ${T(44, 1314, 24, 800, C.orange, l)}
  ${T(W - 44, 1314, 22, 700, C.mut, r, { ls: 1, anchor: "end" })}`;
function card(name, body) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}
    <rect width="${W}" height="${H}" fill="url(#bgGrad)"/><rect width="${W}" height="${H}" fill="url(#glow)"/>${body}</svg>`;
  fs.writeFileSync(path.join(OUT, `${name}.png`), renderPng(svg));
  console.log(`✓ ${OUT}/${name}.png`);
}
function storyCard(name, body) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}">${defs}
    <rect width="${SW}" height="${SH}" fill="url(#bgGrad)"/><rect width="${SW}" height="${SH}" fill="url(#glow)"/>
    <rect width="${SW}" height="8" fill="${C.orange}"/>${body}</svg>`;
  fs.writeFileSync(path.join(OUT, `${name}.png`), renderPng(svg));
  console.log(`✓ ${OUT}/${name}.png`);
}
const pillars = (cy, active) => {
  const col = (p) => (p === active ? C.orange : "rgba(246,246,244,0.30)");
  return `<text x="${SW / 2}" y="${cy}" font-family="${SD}" font-weight="700" font-size="40" letter-spacing="6" text-anchor="middle"><tspan fill="${col("SEEN")}">SEEN</tspan><tspan fill="rgba(246,246,244,0.22)">   ·   </tspan><tspan fill="${col("TRACKED")}">TRACKED</tspan><tspan fill="rgba(246,246,244,0.22)">   ·   </tspan><tspan fill="${col("HOME")}">HOME</tspan></text>`;
};
const covTile = (cx, top, big, unit) => { const w = 300, x = cx - w / 2; return `<rect x="${x}" y="${top}" width="${w}" height="206" rx="18" fill="${C.panel}" stroke="rgba(255,106,26,0.26)" stroke-width="1.5"/>
  ${TD(cx, top + 122, 78, 800, C.orange, big, { anchor: "middle" })}
  ${T(cx, top + 170, 20, 800, C.mut, unit, { ls: 3, anchor: "middle" })}`; };

// ============================================================ WE'RE LIVE feed
card("launch-live", `${header("06.18 · LIVE NOW")}
  <circle cx="${W / 2 - 150}" cy="300" r="13" fill="${C.teal}"/>
  ${T(W / 2 - 124, 308, 26, 800, C.teal, "LIVE NOW", { ls: 6 })}
  ${TD(W / 2, 470, 168, 800, C.text, "WE'RE LIVE.", { anchor: "middle" })}
  ${T(W / 2, 548, 30, 600, C.mut, "The DMV's home court is open. Every team, every player,", { anchor: "middle" })}
  ${T(W / 2, 588, 30, 600, C.mut, "one place — real stats, real development, no fake rankings.", { anchor: "middle" })}
  ${covTile(218, 700, "800+", "PLAYERS")}
  ${covTile(540, 700, "300+", "SCHOOLS")}
  ${covTile(862, 700, "DMV", "DC · MD · VA")}
  ${T(W / 2, 1012, 27, 700, C.text, "Search your name. Claim your profile. Free.", { anchor: "middle" })}
  <rect x="${W / 2 - 250}" y="1066" width="500" height="86" rx="43" fill="url(#band)"/>
  ${T(W / 2, 1122, 34, 800, C.bg, "PROSPERAHOOPS.COM", { ls: 1, anchor: "middle" })}
  ${footer()}`);

// ============================================================ WE'RE LIVE story
storyCard("launch-live-story", `
  <g transform="translate(${SW / 2 - 34},120)"><svg width="68" height="68" viewBox="0 0 200 200">${EMBLEM}</svg></g>
  <text x="${SW / 2}" y="290" font-family="${HG}" font-weight="800" font-size="32" letter-spacing="3" text-anchor="middle"><tspan fill="${C.text}">PROSPERA </tspan><tspan fill="${C.orange}">HOOPS</tspan></text>
  <circle cx="${SW / 2 - 132}" cy="560" r="15" fill="${C.teal}"/>
  ${T(SW / 2 - 104, 570, 32, 800, C.teal, "LIVE NOW", { ls: 8 })}
  ${TD(SW / 2, 960, 200, 800, C.text, "HOME.", { anchor: "middle" })}
  ${T(SW / 2, 1046, 34, 600, C.mut, "Every DMV hooper. One place.", { anchor: "middle" })}
  ${pillars(1230, "HOME")}
  ${T(SW / 2, 1430, 30, 800, C.text, "THE BOARD IS OPEN.", { ls: 4, anchor: "middle" })}
  <rect x="${SW / 2 - 250}" y="1520" width="500" height="92" rx="46" fill="url(#band)"/>
  ${T(SW / 2, 1580, 34, 800, C.bg, "PROSPERAHOOPS.COM", { ls: 1, anchor: "middle" })}
  <line x1="80" y1="1812" x2="1000" y2="1812" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>
  ${T(80, 1858, 24, 700, C.mut, "SEARCH YOUR NAME · CLAIM FREE", { ls: 2 })}`);

// ============================================================ MORNING countdown
card("launch-countdown-today", `${header("06.18")}
  ${T(W / 2, 360, 28, 800, C.orange, "TODAY", { ls: 14, anchor: "middle" })}
  ${TD(W / 2, 600, 230, 800, C.text, "5PM", { anchor: "middle" })}
  ${T(W / 2, 686, 40, 800, C.mut, "EST", { ls: 16, anchor: "middle" })}
  ${T(W / 2, 800, 30, 600, C.mut, "The DMV's home court opens. Every team, every player —", { anchor: "middle" })}
  ${T(W / 2, 840, 30, 600, C.mut, "real stats, real development, no fake rankings.", { anchor: "middle" })}
  ${T(W / 2, 968, 27, 700, C.text, "You're already on the board. Be ready to claim it.", { anchor: "middle" })}
  <rect x="${W / 2 - 230}" y="1030" width="460" height="84" rx="42" fill="none" stroke="${C.orange}" stroke-width="2.5"/>
  ${T(W / 2, 1084, 30, 800, C.orange, "PROSPERAHOOPS.COM", { ls: 1, anchor: "middle" })}
  ${footer()}`);

// ============================================================ "HOW IT WORKS" carousel
const slide = (name, num, kicker, head, lines, opts = {}) => {
  const accent = opts.accent || C.orange;
  const body = `${header("")}
    ${T(40, 150, 22, 800, accent, num, { ls: 2 })}<text x="84" y="150" font-family="${HG}" font-weight="700" font-size="22" fill="${C.faint}" letter-spacing="2">/ 06</text>
    ${T(40, 300, 24, 800, accent, kicker, { ls: 5 })}
    ${head.map((ln, i) => TD(40, 392 + i * 92, 84, 800, C.text, esc(ln))).join("")}
    ${lines.map((ln, i) => T(40, 392 + head.length * 92 + 40 + i * 50, 28, 500, C.mut, esc(ln))).join("")}
    ${opts.tag ? `<rect x="40" y="1070" width="${opts.tag.length * 17 + 56}" height="62" rx="14" fill="${C.panel}" stroke="rgba(255,106,26,0.3)" stroke-width="1.5"/>${T(68, 1110, 26, 700, accent, esc(opts.tag), { ls: 1 })}` : ""}
    ${footer(opts.foot || "Swipe →", "@PROSPERAHOOPS")}`;
  card(name, body);
};

slide("how-01-cover", "01", "THIS IS", ["PROSPERA", "HOOPS."],
  ["The DMV's scouting platform — high school, AAU & more.", "Real stats. Real development. No fake rankings."],
  { tag: "SEARCH · CLAIM · TRACK", foot: "Swipe to see how →" });

slide("how-02-onboard", "02", "STEP ONE", ["YOU'RE ALREADY", "ON THE BOARD."],
  ["800+ DMV players are already in the database.", "Search your name — your profile is waiting.", "Box scores from Capitol Hoops Summer League."],
  { tag: "FIND YOURSELF" });

slide("how-03-stats", "03", "WHAT YOU GET", ["REAL STATS.", "REAL GROWTH."],
  ["Every game, split by context — HS, summer, AAU.", "A development arc that sharpens with every game.", "The honest read behind the numbers. No hype."],
  { tag: "NO FAKE RANKINGS", accent: C.teal });

slide("how-04-claim", "04", "MAKE IT YOURS", ["CLAIM YOUR", "PROFILE — FREE."],
  ["Lock in your spot in one tap — no password.", "Add your film, recruiting info, and contact.", "Not in the database yet? Add yourself, we verify."],
  { tag: "FREE FOREVER FOR EARLY MEMBERS" });

slide("how-05-coach", "05", "FOR THE SIDELINE", ["COACH HQ.", "SCOUT SMARTER."],
  ["Opponent game plans, your-team analytics,", "5-on-5 matchup builder, depth charts.", "Free during launch — built for DMV coaches."],
  { tag: "COACHES → COACH HQ", accent: C.blue });

slide("how-06-live", "06", "IT'S OPEN", ["WE'RE LIVE.", "GET ON IT."],
  ["The whole DMV, one home court.", "Search your name. Claim your profile. Free."],
  { tag: "PROSPERAHOOPS.COM", foot: "ProsperaHoops.com" });

console.log("\nLaunch-day set complete → docs/social-posts/");
