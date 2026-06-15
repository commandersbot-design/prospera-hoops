// Launch graphic set — "A1 Graphite" illuminated-triad campaign → docs/launch-set/
// 4 dates × 2 canvases (feed 1080x1080 + story 1080x1920) = 8 export-ready PNGs.
// The triad SEEN · TRACKED · HOME sits in a fixed band; each day lights a different word.
// Display: Saira Condensed 800 · Body: Hanken Grotesk. Rendered via resvg (real fonts, no serif).
// Run: node scripts/gen-launch-set.mjs
import { Resvg } from "@resvg/resvg-js";
import fs from "fs";
import path from "path";

const OUT = "docs/launch-set";
fs.mkdirSync(OUT, { recursive: true });
const C = { off: "#F4F2ED", orange: "#F25C1F", dim: "rgba(244,242,237,0.22)", mut: "#9A9DA4", hair: "rgba(244,242,237,0.10)" };
const SC = "Saira Condensed", HG = "Hanken Grotesk";
const ttfBufs = (p) => [...fs.readFileSync(p, "utf8").matchAll(/base64,([A-Za-z0-9+/=]+)\)/g)].map((m) => Buffer.from(m[1], "base64"));
const FONTS = [...ttfBufs("brand-kit/saira-condensed-embed.svgstyle"), ...ttfBufs("brand-kit/hanken-embed.svgstyle")];
const renderPng = (svg) => new Resvg(svg, { font: { fontBuffers: FONTS, defaultFontFamily: "Hanken Grotesk", loadSystemFonts: false } }).render().asPng();
const EMBLEM = fs.readFileSync("brand-kit/prospera-emblem.svg", "utf8").replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const T = (x, y, s, w, fill, font, txt, ls = 0, anchor = "start") => `<text x="${x}" y="${y}" font-family="${font}" font-weight="${w}" font-size="${s}" fill="${fill}" letter-spacing="${ls}" text-anchor="${anchor}">${esc(txt)}</text>`;
const emblemAt = (x, y, s) => `<g transform="translate(${x},${y})"><svg width="${s}" height="${s}" viewBox="0 0 200 200">${EMBLEM}</svg></g>`;

// triad row: lays SEEN · TRACKED · HOME centered at (cx,y); lit[i] => orange, else dim.
function triad(cx, y, fs, lit) {
  const words = ["SEEN", "TRACKED", "HOME"], cw = fs * 0.5, sepW = fs * 0.78;
  const ww = words.map((w) => w.length * cw);
  let x = cx - (ww[0] + ww[1] + ww[2] + 2 * sepW) / 2, out = "";
  words.forEach((w, i) => {
    out += `<text x="${x}" y="${y}" font-family="${SC}" font-weight="800" font-size="${fs}" fill="${lit[i] ? C.orange : C.dim}" letter-spacing="1">${w}</text>`;
    x += ww[i];
    if (i < 2) { out += `<text x="${x + sepW * 0.32}" y="${y}" font-family="${SC}" font-weight="800" font-size="${fs}" fill="${C.dim}">·</text>`; x += sepW; }
  });
  return out;
}

function artboard(w, h, g) {
  const story = h > w, cx = w / 2, m = story ? 100 : 80;
  // logo lockup
  const logoY = m, logo = story
    ? `${emblemAt(cx - 27, logoY, 54)}${T(cx, logoY + 88, 30, 800, C.off, HG, "PROSPERA HOOPS", 1, "middle")}`
    : `${emblemAt(m, logoY, 54)}${T(m + 70, logoY + 38, 30, 800, C.off, HG, "PROSPERA HOOPS", 1)}`;
  const triadY = story ? h * 0.66 : h * 0.70;
  const triadFS = g.bigTriad ? (story ? 132 : 116) : (story ? 60 : 52);
  let body;
  if (g.bigTriad) {
    const eyeY = story ? h * 0.22 : h * 0.22;
    const fs = story ? 200 : 172, lh = fs;
    const words = ["SEEN.", "TRACKED.", "HOME."];
    const first = h * 0.5 - 0.72 * fs;
    const stack = words.map((wd, i) => T(cx, first + i * lh, fs, 800, g.lit[i] ? C.orange : C.dim, SC, wd, 1, "middle")).join("");
    body = `${T(cx, eyeY, story ? 30 : 28, 700, C.orange, HG, g.eyebrow, 6, "middle")}
      ${stack}
      ${T(cx, first + 2 * lh + (story ? 96 : 82), story ? 36 : 34, 500, C.mut, HG, g.sub, 0.5, "middle")}`;
  } else {
    const eyeY = story ? h * 0.26 : h * 0.25;
    const heroY = story ? h * 0.50 : h * 0.50;
    const heroFS = story ? 250 : 210;
    body = `${T(cx, eyeY, story ? 30 : 28, 700, C.orange, HG, g.eyebrow, 5, "middle")}
      ${T(cx, heroY, heroFS, 800, C.off, SC, g.hero, 1, "middle")}
      ${T(cx, heroY + (story ? 80 : 74), story ? 38 : 36, 500, C.mut, HG, g.sub, 0.5, "middle")}
      <line x1="${cx - 40}" y1="${triadY - (story ? 80 : 72)}" x2="${cx + 40}" y2="${triadY - (story ? 80 : 72)}" stroke="${C.hair}" stroke-width="2"/>
      ${triad(cx, triadY, triadFS, g.lit)}`;
  }
  // footer
  const fy = h - m;
  const chip = g.chip ? `<rect x="${cx + 100}" y="${fy - 30}" width="92" height="38" rx="8" fill="${C.orange}"/>${T(cx + 146, fy - 3, 24, 800, "#1A0E07", HG, "06.18", 1, "middle")}` : "";
  const footer = g.chip
    ? `${T(cx - 110, fy, 22, 700, C.mut, HG, "THE DMV'S HOME COURT", 3, "middle")}${chip}`
    : T(cx, fy, 22, 700, C.mut, HG, "THE DMV'S HOME COURT", 4, "middle");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16181C"/><stop offset="1" stop-color="#0D0E11"/></linearGradient>
    <radialGradient id="gl" cx="0.5" cy="${g.bigTriad ? 0.5 : 0.7}" r="0.6"><stop offset="0" stop-color="#F25C1F" stop-opacity="${g.glow ? 0.16 : 0.06}"/><stop offset="1" stop-color="#F25C1F" stop-opacity="0"/></radialGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/><rect width="${w}" height="${h}" fill="url(#gl)"/>
    <line x1="${m}" y1="${(story ? m + 110 : m + 70)}" x2="${w - m}" y2="${(story ? m + 110 : m + 70)}" stroke="${C.hair}" stroke-width="1.5"/>
    ${logo}${body}
    <line x1="${m}" y1="${fy - 40}" x2="${w - m}" y2="${fy - 40}" stroke="${C.hair}" stroke-width="1.5"/>
    ${footer}</svg>`;
}

const GRAPHICS = [
  { id: "0615-announce", eyebrow: "LAUNCHING 06.18", bigTriad: true, lit: [1, 1, 1], sub: "A home for DMV hoopers.", chip: true },
  { id: "0616-seen", eyebrow: "06.16 · 2 DAYS OUT", hero: "SEEN.", sub: "Every player. Every game.", lit: [1, 0, 0], chip: true },
  { id: "0617-tracked", eyebrow: "06.17 · TOMORROW", hero: "TRACKED.", sub: "Every step of your development.", lit: [0, 1, 0], chip: true },
  { id: "0618-launch", eyebrow: "06.18 · NOW LIVE", hero: "IT'S LIVE.", sub: "A home for DMV hoopers — go find your game.", lit: [1, 1, 1], glow: true, chip: false },
];

for (const g of GRAPHICS) {
  fs.writeFileSync(path.join(OUT, `prospera_launch_${g.id}_square.png`), renderPng(artboard(1080, 1080, g)));
  fs.writeFileSync(path.join(OUT, `prospera_launch_${g.id}_story.png`), renderPng(artboard(1080, 1920, g)));
}
// clean old (pre-triad) set
for (const f of fs.readdirSync(OUT)) if (/^[1-5]-/.test(f)) fs.rmSync(path.join(OUT, f));
console.log(`launch set → ${OUT}/: ${GRAPHICS.length} dates × square+story (${GRAPHICS.length * 2} PNGs)`);
