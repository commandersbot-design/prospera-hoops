// Launch-eve social graphics — SAME format/font as the Hayfield stat-drop card
// (1080×1350, Oswald + Hanken, emblem header, Resvg). Box scores credited to
// Capitol Hoops Summer League. Output → docs/social-posts/.
//   1) Will Braun-Duin — RED HOT (56 & 40, May 21 doubleheader)
//   2) Major Jones — THE LEAP (year-over-year)
//   3) DMV Summer Scoring Leaders (top 5)
// Run: node scripts/gen-launch-eve.mjs
import { Resvg } from "@resvg/resvg-js";
import fs from "fs";
import path from "path";

const OUT = "docs/social-posts";
fs.mkdirSync(OUT, { recursive: true });
const W = 1080, H = 1350;
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
const tagPill = (cx, y, txt, col = C.orange) => { const fz = 18, w = txt.length * (fz * 0.6) + 44; return `<rect x="${cx - w / 2}" y="${y - fz - 2}" width="${w}" height="${fz + 14}" rx="${(fz + 14) / 2}" fill="none" stroke="${col}" stroke-width="1.5"/>${T(cx, y, fz, 700, col, esc(txt), { ls: 2, anchor: "middle" })}`; };

const defs = `<defs>${FONT_SD}${FONT_HG}
  <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E1219"/><stop offset="1" stop-color="#080A0E"/></linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.26" r="0.7"><stop offset="0" stop-color="${C.orange}" stop-opacity="0.15"/><stop offset="1" stop-color="${C.orange}" stop-opacity="0"/></radialGradient>
  <linearGradient id="band" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FF6A1A"/><stop offset="1" stop-color="#FF8A3D"/></linearGradient></defs>`;

const header = (tag) => `${emblemAt(40, 36, 60)}
  <text x="116" y="70" font-family="${HG}" font-weight="800" font-size="28"><tspan fill="${C.text}">PROSPERA</tspan><tspan fill="${C.orange}" dx="8">HOOPS</tspan></text>
  ${T(118, 94, 12, 700, C.mut, "DMV HOOPS DATA", { ls: 3 })}
  ${T(W - 40, 70, 18, 700, C.orange, tag, { ls: 2, anchor: "end" })}`;
const band = (title, r1, r2) => `<rect x="40" y="150" width="${W - 80}" height="118" rx="18" fill="url(#band)" stroke="rgba(0,0,0,0.22)" stroke-width="1.5"/>
  ${T(66, 226, 54, 800, C.bg, esc(title), { font: SD })}
  ${r1 ? T(W - 64, 200, 19, 800, C.bg, esc(r1), { ls: 2, anchor: "end" }) : ""}
  ${r2 ? T(W - 64, 232, 16, 700, "rgba(11,14,19,0.72)", esc(r2), { ls: 1, anchor: "end" }) : ""}`;
const footer = (credit) => `${T(W / 2, 1246, 16, 500, C.faint, credit, { anchor: "middle" })}
  <line x1="44" y1="1276" x2="${W - 44}" y2="1276" stroke="${C.line}" stroke-width="1.5"/>
  ${T(44, 1314, 24, 800, C.orange, "ProsperaHoops.com")}
  ${T(W - 44, 1314, 22, 700, C.mut, "@PROSPERAHOOPS", { ls: 1, anchor: "end" })}`;

function card(name, body) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}
    <rect width="${W}" height="${H}" fill="url(#bgGrad)"/><rect width="${W}" height="${H}" fill="url(#glow)"/>${body}</svg>`;
  fs.writeFileSync(path.join(OUT, `${name}.png`), renderPng(svg));
  console.log(`✓ ${OUT}/${name}.png`);
}

// 1) RED HOT — Will Braun-Duin
const statTile = (cx, top, big, unit, sub) => { const w = 468, x = cx - w / 2; return `<rect x="${x}" y="${top}" width="${w}" height="360" rx="20" fill="${C.panel}" stroke="rgba(255,106,26,0.30)" stroke-width="1.5"/>
  ${TD(cx, top + 218, 168, 800, C.orange, big, { anchor: "middle" })}
  ${T(cx, top + 268, 24, 800, C.mut, unit, { ls: 4, anchor: "middle" })}
  ${T(cx, top + 322, 23, 700, C.text, esc(sub), { anchor: "middle" })}`; };
card("post-will-redhot", `${header("STAT DROP")}
  ${band("WILL BRAUN-DUIN", "28.6 PPG", "JOHN HANDLEY · 2ND IN THE DMV")}
  ${T(W / 2, 338, 24, 800, C.orange, "RED HOT — A 96-POINT DAY", { ls: 5, anchor: "middle" })}
  ${statTile(286, 392, "56", "PTS", "vs Purple Storm · W")}
  ${statTile(794, 392, "40", "PTS", "vs Heritage")}
  ${TD(W / 2, 880, 78, 800, C.text, "96 POINTS. ONE DAY.", { anchor: "middle" })}
  ${T(W / 2, 940, 27, 600, C.mut, "Two games, one slate. The book is open.", { anchor: "middle" })}
  ${tagPill(W / 2, 1058, "DOUBLEHEADER · MAY 21")}
  ${footer("Box scores: Capitol Hoops Summer League · summer-league averages")}`);

// 2) THE LEAP — Major Jones
const leapRow = (y, label, prior, now, delta) => `${T(150, y, 38, 800, C.mut, label, { font: SD, ls: 3 })}
  ${TD(440, y, 76, 700, C.mut, prior, { anchor: "middle" })}
  ${T(560, y - 16, 40, 700, C.mut, "→", { anchor: "middle" })}
  ${TD(706, y + 6, 96, 800, C.text, now, { anchor: "middle" })}
  ${TD(905, y, 56, 800, C.teal, "+" + delta, { anchor: "middle" })}`;
card("post-major-leap", `${header("THE LEAP")}
  ${band("MAJOR JONES", "DEMATHA", "YEAR-OVER-YEAR JUMP")}
  <rect x="80" y="360" width="920" height="560" rx="20" fill="${C.panel}" stroke="rgba(59,158,255,0.30)" stroke-width="1.5"/>
  ${T(440, 432, 24, 700, C.mut, "'25", { ls: 4, anchor: "middle" })}
  ${T(706, 432, 24, 700, C.orange, "'26", { ls: 4, anchor: "middle" })}
  <line x1="130" y1="462" x2="950" y2="462" stroke="${C.line}" stroke-width="1.5"/>
  ${leapRow(560, "PTS", "8.4", "11.8", "3.4")}
  ${leapRow(700, "REB", "1.6", "3.0", "1.4")}
  ${leapRow(840, "AST", "1.0", "3.5", "2.5")}
  ${T(W / 2, 1010, 30, 600, C.mut, "Development, tracked over time.", { anchor: "middle" })}
  ${tagPill(W / 2, 1098, "SUMMER · '25 → '26", C.blue)}
  ${footer("Box scores: Capitol Hoops Summer League · summer-league averages")}`);

// 3) DMV Summer Scoring Leaders
const rows = [["1", "DREW HILL", "St. John's", "28.8"], ["2", "WILL BRAUN-DUIN", "John Handley", "28.6"], ["3", "JEREMIAH WILLIAMS", "Walter Johnson", "28.3"], ["4", "GABE COLSTON", "JFK", "28.0"], ["5", "JORDAN FOX", "DOZA", "27.9"]];
const lrow = (y, [rk, nm, tm, ppg]) => `${TD(150, y + 8, 64, 800, rk === "1" ? C.orange : C.faint, rk, { anchor: "middle" })}
  ${T(230, y, 46, 800, C.text, esc(nm), { font: SD })}
  ${T(230, y + 36, 24, 600, C.mut, esc(tm))}
  ${TD(W - 80, y + 10, 72, 800, C.orange, ppg, { anchor: "end" })}`;
card("post-leaders", `${header("LEADERS")}
  ${band("SCORING LEADERS", "DMV SUMMER", "TOP 5 · MIN 5 GP")}
  ${rows.map((r, i) => `<rect x="80" y="${330 + i * 150}" width="920" height="128" rx="16" fill="${C.panel}" stroke="${C.line}" stroke-width="1"/>${lrow(404 + i * 150, r)}`).join("")}
  ${T(W / 2, 1230, 17, 500, C.faint, "Real box scores. No fake rankings. Min. 5 games played.", { anchor: "middle" })}
  ${footer("Box scores: Capitol Hoops Summer League")}`);

console.log("\nDone → docs/social-posts/ (post-will-redhot, post-major-leap, post-leaders)");
