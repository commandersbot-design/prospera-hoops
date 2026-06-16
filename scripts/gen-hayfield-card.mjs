// Hayfield Hawks team stat-drop card → docs/social-posts/hayfield-standouts.png
// 1080x1350. Hayfield-themed (navy + Columbia blue) over the Prospera frame.
// 3 players = real Capitol Hoops Summer League lines (read live from data);
// Gavin Payne = his VHSL Live game high (19 pts vs Yorktown), tagged as a
// separate event so contexts never blur. Run: node scripts/gen-hayfield-card.mjs
import { Resvg } from "@resvg/resvg-js";
import fs from "fs";
import path from "path";

const OUT = "docs/social-posts";
fs.mkdirSync(OUT, { recursive: true });
const W = 1080, H = 1350;
// Prospera tokens + Hayfield Hawks accents (navy / Columbia blue).
const C = {
  bg: "#0B0E13", panel: "#0F141B", line: "rgba(255,255,255,0.08)",
  orange: "#FF6A1A", text: "#f6f6f4", mut: "#8b929c", faint: "#5a626c",
  // Hayfield Hawks identity: orange + black.
  hawk: "#F4731E", hawk2: "#FF8A3D", sky: "#FF6A1A", skyLine: "rgba(255,106,26,0.32)",
  ink: "#0B0E13", inkSoft: "rgba(11,14,19,0.70)",
};
const SD = "Oswald", HG = "Hanken Grotesk";
const ttfBufs = (p) => [...fs.readFileSync(p, "utf8").matchAll(/base64,([A-Za-z0-9+/=]+)\)/g)].map((m) => Buffer.from(m[1], "base64"));
const FONTS = [...ttfBufs("brand-kit/oswald-embed.svgstyle"), ...ttfBufs("brand-kit/hanken-embed.svgstyle")];
const FONT_SD = fs.readFileSync("brand-kit/oswald-embed.svgstyle", "utf8");
const FONT_HG = fs.readFileSync("brand-kit/hanken-embed.svgstyle", "utf8");
const renderPng = (svg) => new Resvg(svg, { font: { fontBuffers: FONTS, defaultFontFamily: "Hanken Grotesk", loadSystemFonts: false } }).render().asPng();
const EMBLEM = fs.readFileSync("brand-kit/prospera-emblem.svg", "utf8").replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const HAWK = "data:image/png;base64," + fs.readFileSync("brand-kit/hayfield-hawk-black.png").toString("base64");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const r1 = (n) => (isFinite(n) ? (Math.round(n * 10) / 10).toFixed(1) : "—");

// --- pull the three summer lines live so the numbers are never transcribed wrong
const ch = JSON.parse(fs.readFileSync("public/data/capitolHoops.json", "utf8"));
const findHawk = (re) => {
  for (const t of Object.values(ch.teams)) {
    if (!/hawks \(hayfield\)/i.test(t.name)) continue;
    const p = (t.players || []).find((pl) => re.test(pl.name));
    if (p) return p;
  }
  return null;
};
const towe = findHawk(/towe/i), jackson = findHawk(/chase jackson/i), cage = findHawk(/grant cage/i);

const tiles = [
  { name: "CHRISTIAN TOWE", big: r1(towe.stats.ppg), unit: "PPG",
    sub: `PG · ${r1(towe.stats.rpg)} REB · ${r1(towe.stats.apg)} AST`, tag: "CAPITOL HOOPS" },
  { name: "CHASE JACKSON", big: r1(jackson.stats.ppg), unit: "PPG",
    sub: `G · ${r1(jackson.stats.threePct)}% 3PT · ${r1(jackson.stats.rpg)} REB`, tag: "CAPITOL HOOPS" },
  { name: "GRANT CAGE", big: r1(cage.stats.ppg), unit: "PPG",
    sub: `G · ${r1(cage.stats.rpg)} REB · ${r1(cage.stats.apg)} AST`, tag: "CAPITOL HOOPS" },
  { name: "GAVIN PAYNE", big: "19", unit: "PTS",
    sub: "GAME HIGH · W vs YORKTOWN", tag: "VHSL LIVE" },
];

// --- helpers ---------------------------------------------------------------
const defs = `<defs>${FONT_SD}${FONT_HG}
  <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E1219"/><stop offset="1" stop-color="#080A0E"/></linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.26" r="0.7"><stop offset="0" stop-color="${C.hawk}" stop-opacity="0.16"/><stop offset="1" stop-color="${C.hawk}" stop-opacity="0"/></radialGradient>
  <linearGradient id="band" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.hawk}"/><stop offset="1" stop-color="${C.hawk2}"/></linearGradient></defs>`;
const T = (x, y, s, w, fill, txt, o = {}) => `<text x="${x}" y="${y}" font-family="${o.font || HG}" font-weight="${w}" font-size="${s}" fill="${fill}"${o.ls ? ` letter-spacing="${o.ls}"` : ""}${o.anchor ? ` text-anchor="${o.anchor}"` : ""}>${txt}</text>`;
const TD = (x, y, s, w, fill, txt, o = {}) => T(x, y, s, w, fill, txt, { ...o, font: SD });
const emblemAt = (x, y, s) => `<g transform="translate(${x},${y})"><svg width="${s}" height="${s}" viewBox="0 0 200 200">${EMBLEM}</svg></g>`;

// tag pill (Columbia-blue outline)
const tagPill = (cx, y, txt) => { const fs = 18, w = txt.length * (fs * 0.58) + 40; return `<rect x="${cx - w / 2}" y="${y - fs - 2}" width="${w}" height="${fs + 14}" rx="${(fs + 14) / 2}" fill="none" stroke="${C.sky}" stroke-width="1.5"/>${T(cx, y, fs, 700, C.sky, esc(txt), { ls: 2, anchor: "middle" })}`; };

// one 2x2 tile
function tile(cx, top, d) {
  const w = 468, h = 392, x = cx - w / 2;
  return `<rect x="${x}" y="${top}" width="${w}" height="${h}" rx="20" fill="${C.panel}" stroke="${C.skyLine}" stroke-width="1.5"/>
    ${T(cx, top + 64, 38, 800, C.text, esc(d.name), { font: SD, anchor: "middle" })}
    ${T(cx, top + 100, 20, 600, C.mut, esc(d.sub), { anchor: "middle" })}
    ${TD(cx, top + 252, 132, 800, C.sky, esc(d.big), { anchor: "middle" })}
    ${T(cx, top + 296, 24, 800, C.mut, esc(d.unit), { ls: 4, anchor: "middle" })}
    ${tagPill(cx, top + 356, d.tag)}`;
}

const colL = 274, colR = W - 274, row1 = 398, row2 = row1 + 410;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}
  <rect width="${W}" height="${H}" fill="url(#bgGrad)"/><rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${emblemAt(40, 36, 60)}
  <text x="116" y="70" font-family="${HG}" font-weight="800" font-size="28"><tspan fill="${C.text}">PROSPERA</tspan><tspan fill="${C.orange}" dx="8">HOOPS</tspan></text>
  ${T(118, 94, 12, 700, C.mut, "DMV HOOPS DATA", { ls: 3 })}
  ${T(W - 40, 70, 18, 700, C.sky, "STAT DROP", { ls: 2, anchor: "end" })}

  <rect x="40" y="150" width="${W - 80}" height="118" rx="18" fill="url(#band)" stroke="rgba(0,0,0,0.22)" stroke-width="1.5"/>
  <image href="${HAWK}" x="66" y="161" width="106" height="96" preserveAspectRatio="xMidYMid meet"/>
  ${T(194, 216, 56, 800, C.ink, "HAYFIELD HAWKS", { font: SD })}
  ${T(W - 64, 200, 19, 800, C.ink, "BOYS BASKETBALL", { ls: 2, anchor: "end" })}
  ${T(W - 64, 232, 16, 700, C.inkSoft, "Alexandria, VA", { ls: 1, anchor: "end" })}

  ${T(W / 2, 338, 23, 800, C.sky, "SUMMER STANDOUTS — FOUR TO WATCH", { ls: 3, anchor: "middle" })}

  ${tile(colL, row1, tiles[0])}
  ${tile(colR, row1, tiles[1])}
  ${tile(colL, row2, tiles[2])}
  ${tile(colR, row2, tiles[3])}

  ${T(W / 2, 1248, 17, 500, C.faint, "Capitol Hoops = summer-league averages · Payne = single-game high (VHSL Live, separate event)", { anchor: "middle" })}
  <line x1="44" y1="1276" x2="${W - 44}" y2="1276" stroke="${C.line}" stroke-width="1.5"/>
  ${T(44, 1314, 24, 800, C.orange, "ProsperaHoops.com")}
  ${T(W - 44, 1314, 22, 700, C.mut, "@PROSPERAHOOPS", { ls: 1, anchor: "end" })}
</svg>`;

fs.writeFileSync(path.join(OUT, "hayfield-standouts.png"), renderPng(svg));
console.log(`hayfield card → ${OUT}/hayfield-standouts.png  (Towe ${tiles[0].big}, Jackson ${tiles[1].big}, Cage ${tiles[2].big}, Payne 19 vs Yorktown)`);
