// Hayfield Hawks playoff content pack → docs/social-posts/playoff-0624/*.png
// 4 Instagram slides (1080x1350) from the 6/24/26 Capitol Hoops Summer League
// playoff game vs the Colonels. ALL numbers are single-game (from the official
// LegitGM box score) and tagged "PLAYOFFS · 6.24.26" so they never blur with the
// season averages on the site. Run: node scripts/gen-hayfield-playoff.mjs
import { Resvg } from "@resvg/resvg-js";
import fs from "fs";
import path from "path";

const OUT = "docs/social-posts/playoff-0624";
fs.mkdirSync(OUT, { recursive: true });
const W = 1080, H = 1350;

// Prospera tokens + Hayfield (orange/black) accents — matches gen-hayfield-card.
const C = {
  bg: "#0B0E13", panel: "#0F141B", panel2: "#0C1117", line: "rgba(255,255,255,0.08)",
  orange: "#FF6A1A", text: "#f6f6f4", mut: "#8b929c", faint: "#5a626c",
  hawk: "#F4731E", hawk2: "#FF8A3D", sky: "#FF6A1A", skyLine: "rgba(255,106,26,0.32)",
  ink: "#0B0E13", inkSoft: "rgba(11,14,19,0.70)",
  win: "#36c08a", loss: "#FF6A1A", them: "#6b7480",
};
const SD = "Oswald", HG = "Hanken Grotesk";

const ttfBufs = (p) => [...fs.readFileSync(p, "utf8").matchAll(/base64,([A-Za-z0-9+/=]+)\)/g)].map((m) => Buffer.from(m[1], "base64"));
const FONTS = [...ttfBufs("brand-kit/oswald-embed.svgstyle"), ...ttfBufs("brand-kit/hanken-embed.svgstyle")];
const FONT_SD = fs.readFileSync("brand-kit/oswald-embed.svgstyle", "utf8");
const FONT_HG = fs.readFileSync("brand-kit/hanken-embed.svgstyle", "utf8");
const renderPng = (svg) => new Resvg(svg, { font: { fontBuffers: FONTS, defaultFontFamily: "Hanken Grotesk", loadSystemFonts: false } }).render().asPng();
const EMBLEM = fs.readFileSync("brand-kit/prospera-emblem.svg", "utf8").replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const HAWK = "data:image/png;base64," + fs.readFileSync("brand-kit/hayfield-hawk-white.png").toString("base64");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ====================== GAME DATA (single game · 6/24/26) ====================
const GAME = {
  league: "CAPITOL HOOPS SUMMER LEAGUE",
  round: "PLAYOFFS",
  date: "JUNE 24, 2026",
  hay: 71, col: 75,
  periods: [ // [label, hay, col]
    ["1ST HALF", 27, 33],
    ["2ND HALF", 38, 32],
    ["OT", 6, 10],
  ],
  flow: ["TIED 13 TIMES", "11 LEAD CHANGES", "REGULATION 65–65"],
};
// Standout single-game lines (from the box score).
const STARS = [
  { name: "CHASE JACKSON", big: "24", unit: "PTS", l1: "7-14 FG · 8-8 FT", l2: "2-6 3PT · 4 STL · +12", tag: "TEAM HIGH" },
  { name: "CHRISTIAN TOWE", big: "19", unit: "PTS", l1: "7-18 FG · 6 REB", l2: "2 STL · 1 BLK · 1 AST", tag: "TWO-WAY" },
  { name: "GRANT CAGE", big: "14", unit: "PTS", l1: "2-7 3PT · 6-6 FT", l2: "5 REB · 1 AST", tag: "STRETCH G" },
];
// Bench glue line for the standouts slide footer.
const GLUE = "OFF THE BENCH — CANDIN SWEET: 5 REB · 2 STL · 1 BLK";
// Team line.
const TEAM = [
  ["FG", "22-56", "39%"], ["3PT", "6-18", "33%"], ["FT", "21-28", "75%"],
  ["REB", "33", ""], ["STL", "11", ""], ["AST", "5", ""],
];
// --- NEXT UP (real-world fact — filled from the user; null = render TBA) ------
const NEXT = {
  teaser: "THE HAWKS AREN'T DONE",
  opponent: null,   // e.g. "vs WARRIORS"
  when: null,       // e.g. "SAT · 6.28 · 7:00 PM"
  where: null,      // e.g. "DEMATHA"
};

// ============================== HELPERS ======================================
const defs = `<defs>${FONT_SD}${FONT_HG}
  <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E1219"/><stop offset="1" stop-color="#080A0E"/></linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.24" r="0.78"><stop offset="0" stop-color="${C.hawk}" stop-opacity="0.17"/><stop offset="1" stop-color="${C.hawk}" stop-opacity="0"/></radialGradient>
  <linearGradient id="band" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.hawk}"/><stop offset="1" stop-color="${C.hawk2}"/></linearGradient>
  <linearGradient id="barHay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.hawk2}"/><stop offset="1" stop-color="${C.hawk}"/></linearGradient></defs>`;
const T = (x, y, s, w, fill, txt, o = {}) => `<text x="${x}" y="${y}" font-family="${o.font || HG}" font-weight="${w}" font-size="${s}" fill="${fill}"${o.ls ? ` letter-spacing="${o.ls}"` : ""}${o.anchor ? ` text-anchor="${o.anchor}"` : ""}${o.op != null ? ` opacity="${o.op}"` : ""}>${txt}</text>`;
const TD = (x, y, s, w, fill, txt, o = {}) => T(x, y, s, w, fill, txt, { ...o, font: SD });
const emblemAt = (x, y, s) => `<g transform="translate(${x},${y})"><svg width="${s}" height="${s}" viewBox="0 0 200 200">${EMBLEM}</svg></g>`;
const pill = (cx, y, txt, col = C.sky, fs = 18) => { const w = txt.length * (fs * 0.6) + 42; return `<rect x="${cx - w / 2}" y="${y - fs - 2}" width="${w}" height="${fs + 14}" rx="${(fs + 14) / 2}" fill="none" stroke="${col}" stroke-width="1.5"/>${T(cx, y, fs, 700, col, esc(txt), { ls: 2, anchor: "middle" })}`; };

// Shared chrome: brand header + Hayfield band + slide kicker.
function chrome(kicker) {
  return `<rect width="${W}" height="${H}" fill="url(#bgGrad)"/><rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${emblemAt(40, 36, 60)}
  <text x="116" y="70" font-family="${HG}" font-weight="800" font-size="28"><tspan fill="${C.text}">PROSPERA</tspan><tspan fill="${C.orange}" dx="8">HOOPS</tspan></text>
  ${T(118, 94, 12, 700, C.mut, "DMV HOOPS DATA", { ls: 3 })}
  ${T(W - 40, 70, 18, 700, C.sky, "GAME REPORT", { ls: 2, anchor: "end" })}
  <rect x="40" y="150" width="${W - 80}" height="104" rx="18" fill="url(#band)" stroke="rgba(0,0,0,0.22)" stroke-width="1.5"/>
  <image href="${HAWK}" x="62" y="160" width="94" height="84" preserveAspectRatio="xMidYMid meet"/>
  ${T(176, 196, 46, 800, C.ink, "HAYFIELD HAWKS", { font: SD })}
  ${T(176, 228, 15, 700, C.inkSoft, "ALEXANDRIA, VA · BOYS BASKETBALL", { ls: 1 })}
  ${T(W - 64, 198, 17, 800, C.ink, GAME.round, { ls: 2, anchor: "end" })}
  ${T(W - 64, 228, 14, 700, C.inkSoft, GAME.date, { ls: 1, anchor: "end" })}
  ${kicker ? T(W / 2, 318, 22, 800, C.sky, kicker, { ls: 3, anchor: "middle" }) : ""}`;
}
const footer = (note) => `
  ${note ? T(W / 2, 1252, 16, 500, C.faint, note, { anchor: "middle" }) : ""}
  <line x1="44" y1="1276" x2="${W - 44}" y2="1276" stroke="${C.line}" stroke-width="1.5"/>
  ${T(44, 1314, 24, 800, C.orange, "ProsperaHoops.com")}
  ${T(W - 44, 1314, 22, 700, C.mut, "@PROSPERAHOOPS", { ls: 1, anchor: "end" })}`;

// ============================== SLIDE 1 · RESULT =============================
function slideResult() {
  const teamBlock = (cx, label, score, sub, isHay) => `
    <text x="${cx}" y="560" font-family="${SD}" font-weight="800" font-size="${isHay ? 196 : 170}" fill="${isHay ? C.hawk : C.them}" text-anchor="middle">${score}</text>
    ${T(cx, 632, 34, 800, isHay ? C.text : C.mut, label, { font: SD, anchor: "middle" })}
    ${T(cx, 668, 16, 700, isHay ? C.hawk : C.faint, sub, { ls: 2, anchor: "middle" })}`;
  const periodRow = (y, p) => {
    const [lab, h, c] = p; const hi = h > c;
    return `${T(W / 2, y, 19, 700, C.mut, lab, { ls: 2, anchor: "middle" })}
      ${TD(W / 2 - 150, y, 30, 800, hi ? C.hawk : C.text, h, { anchor: "middle" })}
      ${TD(W / 2 + 150, y, 30, 800, !hi ? C.text : C.mut, c, { anchor: "middle" })}`;
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}
    ${chrome("")}
    ${T(W / 2, 366, 26, 800, C.mut, GAME.league, { ls: 3, anchor: "middle" })}
    ${T(W / 2, 420, 64, 800, C.hawk, "OT HEARTBREAK", { font: SD, anchor: "middle" })}
    ${teamBlock(290, "HAYFIELD", GAME.hay, "HAWKS", true)}
    ${T(W / 2, 520, 40, 700, C.faint, "—", { anchor: "middle" })}
    ${teamBlock(790, "COLONELS", GAME.col, "FINAL / OT", false)}
    <rect x="120" y="724" width="${W - 240}" height="232" rx="20" fill="${C.panel}" stroke="${C.line}" stroke-width="1.5"/>
    ${T(W / 2, 766, 16, 800, C.sky, "BY THE PERIOD", { ls: 4, anchor: "middle" })}
    ${periodRow(820, GAME.periods[0])}
    ${periodRow(872, GAME.periods[1])}
    ${periodRow(924, GAME.periods[2])}
    ${pill(290, 1024, GAME.flow[0], C.skyLine === C.skyLine ? C.sky : C.sky)}
    ${pill(540, 1024, GAME.flow[1])}
    ${pill(790, 1024, GAME.flow[2])}
    ${T(W / 2, 1130, 22, 600, C.text, "Down 6 at the half — the Hawks ripped off a 38–32 surge to", { anchor: "middle" })}
    ${T(W / 2, 1162, 22, 600, C.text, "force overtime before falling in the extra frame.", { anchor: "middle" })}
    ${footer("Official box score · LegitGM / Capitol Hoops Summer League · single game")}
  </svg>`;
  fs.writeFileSync(path.join(OUT, "1-result.png"), renderPng(svg));
}

// ============================ SLIDE 2 · STANDOUTS ============================
function slideStandouts() {
  const card = (top, d) => {
    const x = 70, w = W - 140, h = 268;
    return `<rect x="${x}" y="${top}" width="${w}" height="${h}" rx="20" fill="${C.panel}" stroke="${C.skyLine}" stroke-width="1.5"/>
      ${T(x + 40, top + 78, 40, 800, C.text, esc(d.name), { font: SD })}
      ${T(x + 40, top + 120, 22, 600, C.mut, esc(d.l1), {})}
      ${T(x + 40, top + 156, 22, 600, C.mut, esc(d.l2), {})}
      ${pill(x + 132, top + 220, d.tag, C.sky, 16)}
      ${TD(x + w - 120, top + 150, 116, 800, C.hawk, d.big, { anchor: "middle" })}
      ${T(x + w - 120, top + 200, 22, 800, C.mut, d.unit, { ls: 4, anchor: "middle" })}`;
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}
    ${chrome("WHO SHOWED UP")}
    ${card(372, STARS[0])}
    ${card(660, STARS[1])}
    ${card(948, STARS[2])}
    ${T(W / 2, 1236, 17, 700, C.sky, esc(GLUE), { ls: 1, anchor: "middle" })}
    ${footer("All lines = this game (6.24.26 playoff) · season averages live on ProsperaHoops.com")}
  </svg>`;
  fs.writeFileSync(path.join(OUT, "2-standouts.png"), renderPng(svg));
}

// =========================== SLIDE 3 · THE COMEBACK ==========================
function slideComeback() {
  // Period bar chart: Hayfield vs Colonels per period.
  const bx = 150, bw = W - 300, baseY = 760, maxH = 300, maxV = 40;
  const cols = GAME.periods.length;
  const slot = bw / cols;
  let bars = "";
  GAME.periods.forEach((p, i) => {
    const [lab, h, c] = p;
    const cx = bx + slot * i + slot / 2;
    const hh = (h / maxV) * maxH, ch = (c / maxV) * maxH;
    const bw1 = 64, gap = 18;
    bars += `
      <rect x="${cx - bw1 - gap / 2}" y="${baseY - hh}" width="${bw1}" height="${hh}" rx="8" fill="url(#barHay)"/>
      ${TD(cx - bw1 / 2 - gap / 2, baseY - hh - 14, 30, 800, C.hawk, h, { anchor: "middle" })}
      <rect x="${cx + gap / 2}" y="${baseY - ch}" width="${bw1}" height="${ch}" rx="8" fill="#262b33"/>
      ${TD(cx + bw1 / 2 + gap / 2, baseY - ch - 14, 30, 800, C.them, c, { anchor: "middle" })}
      ${T(cx, baseY + 36, 20, 800, C.mut, lab, { ls: 1, anchor: "middle" })}`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}
    ${chrome("THE COMEBACK THAT FORCED OT")}
    <line x1="${bx}" y1="${baseY}" x2="${W - bx}" y2="${baseY}" stroke="${C.line}" stroke-width="2"/>
    ${bars}
    <rect x="${bx}" y="372" width="${bw}" height="58" rx="12" fill="${C.panel}" stroke="${C.line}" stroke-width="1.5"/>
    ${T(bx + 24, 408, 19, 700, C.text, "● HAYFIELD", {})}
    ${T(bx + 220, 408, 19, 700, C.them, "● COLONELS", {})}
    ${T(W - bx - 24, 408, 18, 700, C.sky, "POINTS PER PERIOD", { ls: 1, anchor: "end" })}
    <rect x="${bx}" y="852" width="${bw}" height="232" rx="20" fill="${C.panel}" stroke="${C.skyLine}" stroke-width="1.5"/>
    ${T(W / 2, 898, 16, 800, C.sky, "SECOND-HALF SURGE", { ls: 4, anchor: "middle" })}
    ${TD(bx + 170, 990, 80, 800, C.hawk, "52%", { anchor: "middle" })}
    ${T(bx + 170, 1034, 18, 700, C.mut, "FG (13-25)", { anchor: "middle" })}
    ${TD(W / 2, 990, 80, 800, C.hawk, "50%", { anchor: "middle" })}
    ${T(W / 2, 1034, 18, 700, C.mut, "3PT (5-10)", { anchor: "middle" })}
    ${TD(W - bx - 170, 990, 80, 800, C.hawk, "+11", { anchor: "middle" })}
    ${T(W - bx - 170, 1034, 18, 700, C.mut, "SWING TO TIE IT", { anchor: "middle" })}
    ${T(W / 2, 1150, 22, 600, C.text, "27 first-half points became 38 in the second — Hayfield shot 52%", { anchor: "middle" })}
    ${T(W / 2, 1182, 22, 600, C.text, "after the break to drag the Colonels into overtime.", { anchor: "middle" })}
    ${footer("")}
  </svg>`;
  fs.writeFileSync(path.join(OUT, "3-comeback.png"), renderPng(svg));
}

// ============================== SLIDE 4 · NEXT UP ============================
function slideNext() {
  const haveNext = NEXT.opponent && NEXT.when;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}
    ${chrome("")}
    ${T(W / 2, 470, 24, 800, C.sky, "NEXT UP", { ls: 8, anchor: "middle" })}
    ${T(W / 2, 588, 92, 800, C.text, esc(NEXT.teaser.split(" ").slice(0, 2).join(" ")), { font: SD, anchor: "middle" })}
    ${T(W / 2, 676, 92, 800, C.hawk, esc(NEXT.teaser.split(" ").slice(2).join(" ")), { font: SD, anchor: "middle" })}
    <rect x="150" y="760" width="${W - 300}" height="${haveNext ? 250 : 180}" rx="20" fill="${C.panel}" stroke="${C.skyLine}" stroke-width="1.5"/>
    ${haveNext
      ? `${T(W / 2, 836, 48, 800, C.text, esc(NEXT.opponent), { font: SD, anchor: "middle" })}
         ${T(W / 2, 900, 26, 700, C.hawk, esc(NEXT.when), { ls: 2, anchor: "middle" })}
         ${NEXT.where ? T(W / 2, 948, 20, 600, C.mut, esc(NEXT.where), { ls: 1, anchor: "middle" }) : ""}`
      : `${T(W / 2, 840, 40, 800, C.text, "MATCHUP TBA", { font: SD, anchor: "middle" })}
         ${T(W / 2, 892, 20, 600, C.mut, "Bracket set soon — follow for the next tip", { anchor: "middle" })}`}
    ${T(W / 2, 1110, 24, 600, C.text, "Full box scores, game logs and development tracking:", { anchor: "middle" })}
    ${T(W / 2, 1156, 30, 800, C.orange, "ProsperaHoops.com", { anchor: "middle" })}
    ${footer("Real stats. Real eyes. The DMV's home court.")}
  </svg>`;
  fs.writeFileSync(path.join(OUT, "4-next.png"), renderPng(svg));
}

slideResult();
slideStandouts();
slideComeback();
slideNext();
console.log(`Playoff pack → ${OUT}/  (1-result, 2-standouts, 3-comeback, 4-next)  ·  Hayfield ${GAME.hay}-${GAME.col} OT`);
