// Launch graphic set ("A1 Graphite", broadcast-grade) → docs/launch-set/
// 5 graphics × 2 canvases (feed 1080x1080, story 1080x1920) = 10 export-ready PNGs.
// Display: Oswald (confirmed) · Body: Hanken Grotesk. Brand: PROSPERA HOOPS.
// Run: node scripts/gen-launch-set.mjs
import { Resvg } from "@resvg/resvg-js";
import fs from "fs";
import path from "path";

const OUT = "docs/launch-set";
fs.mkdirSync(OUT, { recursive: true });
// Render via resvg with explicit font buffers — librsvg/sharp ignores base64 @font-face,
// so it would fall back to a serif. resvg loads the TTFs and renders Oswald/Hanken correctly.
const ttfBufs = (p) => [...fs.readFileSync(p, "utf8").matchAll(/base64,([A-Za-z0-9+/=]+)\)/g)].map((m) => Buffer.from(m[1], "base64"));
const FONTS = [...ttfBufs("brand-kit/oswald-embed.svgstyle"), ...ttfBufs("brand-kit/hanken-embed.svgstyle")];
const renderPng = (svg) => new Resvg(svg, { font: { fontBuffers: FONTS, defaultFontFamily: "Hanken Grotesk", loadSystemFonts: false } }).render().asPng();
const C = { bg: "#141414", bg2: "#0E0E0E", orange: "#FF6A1A", text: "#F4F4F2", mut: "#8A8F98", faint: "#55585F", hair: "rgba(255,255,255,0.09)" };
const OS = "Oswald", HG = "Hanken Grotesk";
const FONT = "<style>" + ["brand-kit/oswald-embed.svgstyle", "brand-kit/hanken-embed.svgstyle"].map((f) => fs.readFileSync(f, "utf8").replace(/<\/?style>/g, "")).join("") + "</style>";
const EMBLEM = fs.readFileSync("brand-kit/prospera-emblem.svg", "utf8").replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const tc = (x, y, s, w, fill, font, txt, ls = 0) => `<text x="${x}" y="${y}" font-family="${font}" font-weight="${w}" font-size="${s}" fill="${fill}" letter-spacing="${ls}" text-anchor="middle">${esc(txt)}</text>`;

const defs = `<defs>${FONT}
  <radialGradient id="vig" cx="0.5" cy="0.42" r="0.85"><stop offset="0.45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient>
  <radialGradient id="glow" cx="0.5" cy="0.4" r="0.6"><stop offset="0" stop-color="#FF6A1A" stop-opacity="0.07"/><stop offset="1" stop-color="#FF6A1A" stop-opacity="0"/></radialGradient></defs>`;
const emblemAt = (cx, y, s) => `<g transform="translate(${cx - s / 2},${y})"><svg width="${s}" height="${s}" viewBox="0 0 200 200">${EMBLEM}</svg></g>`;
// broadcast corner registration marks
const marks = (w, h, m) => [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]]
  .map(([x, y, sx, sy]) => `<path d="M ${x} ${y + sy * 26} L ${x} ${y} L ${x + sx * 26} ${y}" fill="none" stroke="${C.faint}" stroke-width="2"/>`).join("");
const chip = (cx, y, txt, fs) => { const w = txt.length * (fs * 0.6) + 64; return `<rect x="${cx - w / 2}" y="${y - fs - 12}" width="${w}" height="${fs + 30}" rx="8" fill="${C.orange}"/>${tc(cx, y, fs, 700, "#1A0E07", HG, txt, 2)}`; };

// Compose one artboard. g = { kicker, hero:[{t,accent}], subline, counter, cta, stampDate }
function artboard(w, h, g) {
  const cx = w / 2, m = w >= h ? 64 : 96;
  const heroLH = w >= h ? (g.hero.length >= 3 ? 150 : 168) : (g.hero.length >= 3 ? 188 : 208);
  const heroFS = heroLH * 0.86;
  const blockH = g.hero.length * heroLH;
  const first = h * 0.5 - blockH / 2 + heroFS * 0.78;
  const heroSvg = g.hero.map((ln, i) => tc(cx, first + i * heroLH, heroFS, 700, ln.accent ? C.orange : C.text, OS, ln.t, -0.5)).join("");
  const kY = first - heroFS * 0.78 - (w >= h ? 70 : 90);
  const subY = first + (g.hero.length - 1) * heroLH + (w >= h ? 78 : 96);
  const extraY = subY + (w >= h ? 96 : 120);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs}
    <rect width="${w}" height="${h}" fill="${C.bg}"/><rect width="${w}" height="${h}" fill="url(#glow)"/>
    ${marks(w, h, m)}
    ${emblemAt(cx, m + (w >= h ? 4 : 30), 60)}
    <line x1="${cx - 30}" y1="${kY - 34}" x2="${cx + 30}" y2="${kY - 34}" stroke="${C.orange}" stroke-width="3"/>
    ${tc(cx, kY, 26, 700, C.orange, HG, g.kicker, 5)}
    ${heroSvg}
    ${g.subline ? tc(cx, subY, w >= h ? 32 : 38, 500, C.mut, HG, g.subline, 0.5) : ""}
    ${g.counter ? tc(cx, extraY, w >= h ? 40 : 50, 700, C.text, OS, g.counter, 4) : ""}
    ${g.cta ? chip(cx, extraY, g.cta, w >= h ? 30 : 36) : ""}
    <line x1="${m}" y1="${h - m - 44}" x2="${w - m}" y2="${h - m - 44}" stroke="${C.hair}" stroke-width="1.5"/>
    ${tc(cx, h - m, 22, 700, C.mut, HG, g.stamp, 4)}
    <rect width="${w}" height="${h}" fill="url(#vig)"/></svg>`;
}

const GRAPHICS = [
  { id: "1-announce", kicker: "A HOME FOR DMV HOOPERS", hero: [{ t: "SEEN." }, { t: "TRACKED." }, { t: "HOME.", accent: true }], subline: "Every player seen. Every step tracked. All in one place.", stamp: "THE DMV'S HOME COURT  ·  06.18" },
  { id: "2-seen", kicker: "IF YOU HOOPED HERE, YOU'RE IN", hero: [{ t: "EVERY PLAYER." }, { t: "SEEN.", accent: true }], subline: "Every DMV summer-league hooper. Every game.", counter: "2 DAYS", stamp: "THE DMV'S HOME COURT  ·  06.18" },
  { id: "3-tracked", kicker: "GROWTH IS THE STORY", hero: [{ t: "EVERY STEP." }, { t: "TRACKED.", accent: true }], subline: "Your development, tracked all summer long.", counter: "TOMORROW", stamp: "THE DMV'S HOME COURT  ·  06.18" },
  { id: "4-launch", kicker: "IT'S LIVE", hero: [{ t: "THE DMV'S" }, { t: "HOME COURT.", accent: true }], subline: "Every player seen. Every step tracked. All in one place.", cta: "GO FIND YOUR GAME", stamp: "LIVE NOW  ·  06.18" },
  { id: "5-coach", kicker: "FOR COACHES & SCOUTS", hero: [{ t: "FIND." }, { t: "EVALUATE." }, { t: "TRACK.", accent: true }], subline: "Every DMV hooper, one board. Real stats, real development.", stamp: "THE DMV'S HOME COURT" },
];

async function run() {
  for (const g of GRAPHICS) {
    fs.writeFileSync(path.join(OUT, `${g.id}-feed.png`), renderPng(artboard(1080, 1080, g)));
    fs.writeFileSync(path.join(OUT, `${g.id}-story.png`), renderPng(artboard(1080, 1920, g)));
  }
  console.log(`launch set → ${OUT}/: ${GRAPHICS.length} graphics × feed+story (${GRAPHICS.length * 2} PNGs)`);
}
run();
