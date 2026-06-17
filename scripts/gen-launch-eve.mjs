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
// Player portrait medallion: real headshot if public/headshots/<key>.jpg exists, else a monogram.
const portrait = (cx, cy, r, key, initials) => {
  const fp = path.join("public", "headshots", key + ".jpg");
  if (fs.existsSync(fp)) {
    const b64 = fs.readFileSync(fp).toString("base64");
    return `<clipPath id="cp_${key}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
      <image href="data:image/jpeg;base64,${b64}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#cp_${key})"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.orange}" stroke-width="5"/>`;
  }
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#16110d" stroke="${C.orange}" stroke-width="5"/>
    ${TD(cx, cy + r * 0.34, r * 1.02, 800, C.orange, initials, { anchor: "middle" })}`;
};

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

// 1) STAT DROP — Nash Avery (last night's double-double)
const tile4 = (cx, top, big, unit, accent) => { const w = 226, x = cx - w / 2; return `<rect x="${x}" y="${top}" width="${w}" height="296" rx="18" fill="${C.panel}" stroke="rgba(255,106,26,0.26)" stroke-width="1.5"/>
  ${TD(cx, top + 182, 124, 800, accent || C.orange, big, { anchor: "middle" })}
  ${T(cx, top + 240, 23, 800, C.mut, unit, { ls: 4, anchor: "middle" })}`; };
card("post-nash-statline", `${header("STAT DROP")}
  ${T(W / 2, 188, 24, 800, C.orange, "DOUBLE-DOUBLE · LAST NIGHT", { ls: 6, anchor: "middle" })}
  ${portrait(W / 2, 300, 76, "nashavery", "NA")}
  ${TD(W / 2, 512, 100, 800, C.text, "NASH AVERY", { anchor: "middle" })}
  ${T(W / 2, 552, 26, 700, C.sage, "SPALDING · 6'8 WING · CLASS OF '28", { ls: 2, anchor: "middle" })}
  ${T(W / 2, 612, 25, 600, C.mut, "Spalding's sophomore did a little of everything in a 75-70 win", { anchor: "middle" })}
  ${T(W / 2, 646, 25, 600, C.mut, "over The Brook — and he's been doing it all summer.", { anchor: "middle" })}
  ${tile4(174, 696, "24", "PTS")}
  ${tile4(418, 696, "11", "REB")}
  ${tile4(662, 696, "3", "AST", C.text)}
  ${tile4(906, 696, "3", "STL", C.text)}
  ${TD(W / 2, 1078, 64, 800, C.orange, "6'8. TWO-WAY. A 2028.", { anchor: "middle" })}
  ${T(W / 2, 1122, 25, 600, C.teal, "Averaging a double-double — and just getting started.", { anchor: "middle" })}
  ${footer("Box score: Capitol Hoops Summer League · June 16, 2026")}`);

// 2) THE LEAP — Major Jones
const leapRow = (y, label, prior, now, delta) => `${T(150, y, 38, 800, C.mut, label, { font: SD, ls: 3 })}
  ${TD(440, y, 76, 700, C.mut, prior, { anchor: "middle" })}
  ${T(560, y - 16, 40, 700, C.mut, "→", { anchor: "middle" })}
  ${TD(706, y + 6, 96, 800, C.text, now, { anchor: "middle" })}
  ${TD(905, y, 56, 800, C.teal, "+" + delta, { anchor: "middle" })}`;
card("post-major-leap", `${header("THE LEAP")}
  ${T(W / 2, 188, 24, 800, C.blue, "YEAR-OVER-YEAR", { ls: 6, anchor: "middle" })}
  ${portrait(W / 2, 300, 76, "majorjones", "MJ")}
  ${TD(W / 2, 512, 100, 800, C.text, "MAJOR JONES", { anchor: "middle" })}
  ${T(W / 2, 552, 26, 700, C.sage, "DEMATHA · GUARD · YEAR 2", { ls: 2, anchor: "middle" })}
  ${T(W / 2, 612, 25, 600, C.mut, "A year ago, a role player. This summer, the engine —", { anchor: "middle" })}
  ${T(W / 2, 646, 25, 600, C.mut, "scoring up, boards nearly doubled, assists up 3.5×.", { anchor: "middle" })}
  <rect x="80" y="696" width="920" height="356" rx="20" fill="${C.panel}" stroke="rgba(59,158,255,0.30)" stroke-width="1.5"/>
  ${T(440, 752, 24, 700, C.mut, "'25", { ls: 4, anchor: "middle" })}
  ${T(706, 752, 24, 700, C.orange, "'26", { ls: 4, anchor: "middle" })}
  <line x1="130" y1="778" x2="950" y2="778" stroke="${C.line}" stroke-width="1.5"/>
  ${leapRow(854, "PTS", "8.4", "11.8", "3.4")}
  ${leapRow(932, "REB", "1.6", "3.0", "1.4")}
  ${leapRow(1010, "AST", "1.0", "3.5", "2.5")}
  ${TD(W / 2, 1120, 44, 800, C.text, "DEVELOPMENT, TRACKED OVER TIME", { anchor: "middle" })}
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

// 4) LAUNCH COUNTDOWN
card("post-launch-countdown", `${header("LAUNCH")}
  <g transform="translate(${W / 2 - 95},250)"><svg width="190" height="190" viewBox="0 0 200 200">${EMBLEM}</svg></g>
  ${TD(W / 2, 650, 172, 800, C.text, "TOMORROW", { anchor: "middle" })}
  ${T(W / 2, 726, 30, 600, C.mut, "Every DMV hooper. Every team.", { anchor: "middle" })}
  ${T(W / 2, 770, 30, 600, C.mut, "Real stats, tracked over time. On the board.", { anchor: "middle" })}
  <rect x="266" y="852" width="548" height="76" rx="38" fill="url(#band)"/>
  ${T(W / 2, 901, 30, 800, C.bg, "CLAIM YOUR PROFILE — FREE", { ls: 2, anchor: "middle" })}
  ${TD(W / 2, 1042, 62, 800, C.orange, "PROSPERAHOOPS.COM", { anchor: "middle" })}
  ${T(W / 2, 1086, 24, 700, C.mut, "GOES LIVE 6.18", { ls: 6, anchor: "middle" })}
  ${footer("You're already on the board — the DMV's scouting platform.")}`);

// ===== SUMMER STANDOUT player card (Christian Towe format) =================
const HAIR = "#20262E";
function standoutCard(file, { photoKey, team, nm, sub, stats, gp }) {
  const fp = path.join("public", "headshots", photoKey);
  const b64 = fs.existsSync(fp) ? fs.readFileSync(fp).toString("base64") : null;
  const photo = b64
    ? `<image href="data:image/jpeg;base64,${b64}" x="0" y="94" width="${W}" height="760" preserveAspectRatio="xMidYMin slice"/>`
    : `<rect x="0" y="94" width="${W}" height="760" fill="#1B2129"/>`;
  const nameSize = nm.length > 13 ? 78 : 94;
  const cx3 = [180, 540, 900];
  const statCells = stats.map(([v, l], i) => `${TD(cx3[i], 1012, 88, 800, i === 0 ? C.orange : C.text, v, { anchor: "middle" })}${T(cx3[i], 1066, 25, 700, C.mut, l, { ls: 5, anchor: "middle" })}`).join("")
    + [360, 720].map((x) => `<line x1="${x}" y1="946" x2="${x}" y2="1040" stroke="${HAIR}" stroke-width="2"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${defs}<defs><linearGradient id="pfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B0E13" stop-opacity="0"/><stop offset="0.5" stop-color="#0B0E13" stop-opacity="0"/><stop offset="1" stop-color="#0B0E13" stop-opacity="0.97"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="#0B0E13"/>
    ${photo}
    <rect x="0" y="430" width="${W}" height="424" fill="url(#pfade)"/>
    <rect x="0" y="0" width="${W}" height="94" fill="rgba(11,14,19,0.9)"/><rect x="0" y="94" width="${W}" height="4" fill="${C.orange}"/>
    <g transform="translate(40,20)"><svg width="54" height="54" viewBox="0 0 200 200">${EMBLEM}</svg></g>
    ${T(108, 60, 30, 800, C.text, esc(team.toUpperCase()), { ls: 1 })}
    ${T(W - 40, 60, 22, 800, C.orange, "SUMMER STANDOUT", { ls: 3, anchor: "end" })}
    ${TD(48, 792, nameSize, 800, C.text, esc(nm))}
    ${T(50, 836, 28, 700, C.orange, esc(sub), { ls: 2 })}
    <line x1="48" y1="900" x2="${W - 48}" y2="900" stroke="${HAIR}" stroke-width="2"/>
    ${statCells}
    ${tagPill(W / 2, 1160, "CAPITOL HOOPS")}
    ${T(W / 2, 1202, 18, 500, "#5a626c", "Capitol Hoops Summer League · " + gp + " GP", { anchor: "middle" })}
    <line x1="44" y1="1258" x2="${W - 44}" y2="1258" stroke="${C.line}" stroke-width="1.5"/>
    ${T(44, 1300, 24, 800, C.orange, "ProsperaHoops.com")}
    ${T(W - 44, 1300, 22, 700, C.mut, "@PROSPERAHOOPS", { ls: 1, anchor: "end" })}
  </svg>`;
  fs.writeFileSync(path.join(OUT, `${file}.png`), renderPng(svg));
  console.log(`✓ ${OUT}/${file}.png`);
}
standoutCard("card-major-jones", { photoKey: "majorjones-full.jpg", team: "DeMatha", nm: "MAJOR JONES", sub: "GUARD · #0 · DEMATHA · '28", stats: [["11.8", "PPG"], ["3.0", "RPG"], ["3.5", "APG"]], gp: 6 });
standoutCard("card-nash-avery", { photoKey: "nashavery-full.jpg", team: "Spalding", nm: "NASH AVERY", sub: "6'8 WING · #3 · SPALDING · '28", stats: [["18.9", "PPG"], ["10.3", "RPG"], ["2.6", "APG"]], gp: 7 });

// ===== STORY (1080×1920) — TRACKED. teaser, matching yesterday's SEEN. =====
const SW = 1080, SH = 1920;
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
storyCard("story-tracked-1day", `
  <g transform="translate(${SW / 2 - 32},92)"><svg width="64" height="64" viewBox="0 0 200 200">${EMBLEM}</svg></g>
  <text x="${SW / 2}" y="246" font-family="${HG}" font-weight="800" font-size="30" letter-spacing="3" text-anchor="middle"><tspan fill="${C.text}">PROSPERA </tspan><tspan fill="${C.orange}">HOOPS</tspan></text>
  <line x1="300" y1="320" x2="780" y2="320" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
  ${T(SW / 2, 600, 30, 800, C.orange, "06.17 · 1 DAY OUT", { ls: 9, anchor: "middle" })}
  ${TD(SW / 2, 1000, 220, 800, C.text, "TRACKED.", { anchor: "middle" })}
  ${T(SW / 2, 1078, 34, 600, C.mut, "Every game. Over time.", { anchor: "middle" })}
  ${pillars(1240, "TRACKED")}
  ${T(SW / 2, 1420, 30, 800, C.text, "SOMETHING BIG IS COMING.", { ls: 4, anchor: "middle" })}
  <line x1="80" y1="1796" x2="1000" y2="1796" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>
  ${T(80, 1846, 24, 700, C.mut, "THE DMV'S HOME COURT", { ls: 3 })}
  <rect x="896" y="1820" width="104" height="46" rx="11" fill="${C.orange}"/>
  ${T(948, 1851, 24, 800, C.bg, "06.18", { anchor: "middle" })}`);

// ===== Showcase slide 3 (1080×1350) — the HOME / coverage capstone =====
const covTile = (cx, top, big, unit) => { const w = 300, x = cx - w / 2; return `<rect x="${x}" y="${top}" width="${w}" height="206" rx="18" fill="${C.panel}" stroke="rgba(255,106,26,0.26)" stroke-width="1.5"/>
  ${TD(cx, top + 122, 80, 800, C.orange, big, { anchor: "middle" })}
  ${T(cx, top + 168, 19, 800, C.mut, unit, { ls: 2, anchor: "middle" })}`; };
card("post-showcase-home", `${header("THE DMV")}
  ${T(W / 2, 220, 24, 800, C.orange, "EVERY HOOPER · ONE HOME COURT", { ls: 4, anchor: "middle" })}
  ${TD(W / 2, 348, 80, 800, C.text, "SEEN. TRACKED. HOME.", { anchor: "middle" })}
  ${covTile(232, 452, "800+", "PLAYERS")}
  ${covTile(540, 452, "61", "SUMMER TEAMS")}
  ${covTile(848, 452, "306", "HS TEAMS")}
  ${T(W / 2, 762, 28, 600, C.mut, "Real stats. Real development. No fake rankings.", { anchor: "middle" })}
  ${T(W / 2, 802, 28, 600, C.mut, "Every player's already on the board — claim yours, free.", { anchor: "middle" })}
  <rect x="282" y="884" width="516" height="76" rx="38" fill="url(#band)"/>
  ${T(W / 2, 933, 30, 800, C.bg, "CLAIM YOUR PROFILE — FREE", { ls: 2, anchor: "middle" })}
  ${TD(W / 2, 1076, 56, 800, C.orange, "PROSPERAHOOPS.COM", { anchor: "middle" })}
  ${T(W / 2, 1118, 22, 700, C.mut, "LIVE 6.18", { ls: 6, anchor: "middle" })}
  ${footer("The DMV's scouting platform — high school · summer · AAU")}`);

console.log("\nDone → docs/social-posts/ (story-tracked-1day + post-nash-statline, post-major-leap, post-leaders, post-launch-countdown, post-showcase-home)");
