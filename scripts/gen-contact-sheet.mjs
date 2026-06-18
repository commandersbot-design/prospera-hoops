// Contact sheet — tiles every launch-packet graphic into one image so you can
// eyeball the whole set at a glance. Reads the PNGs from docs/social-posts,
// embeds them as data URIs, lays them in a labeled grid, renders with Resvg.
// Run: node scripts/gen-contact-sheet.mjs
import { Resvg } from "@resvg/resvg-js";
import fs from "fs";
import path from "path";

const DIR = "docs/social-posts";
const FONT_SD = fs.readFileSync("brand-kit/oswald-embed.svgstyle", "utf8");
const FONT_HG = fs.readFileSync("brand-kit/hanken-embed.svgstyle", "utf8");
const ttfBufs = (p) => [...fs.readFileSync(p, "utf8").matchAll(/base64,([A-Za-z0-9+/=]+)\)/g)].map((m) => Buffer.from(m[1], "base64"));
const FONTS = [...ttfBufs("brand-kit/oswald-embed.svgstyle"), ...ttfBufs("brand-kit/hanken-embed.svgstyle")];

const files = [
  "launch-countdown-today", "launch-live", "launch-live-story", "packet-home",
  "how-01-cover", "how-02-onboard", "how-03-stats", "how-04-claim", "how-05-coach", "how-06-live", "how-07-beginning",
  "who-01-cover", "who-02-players", "who-03-coaches", "who-04-media", "who-05-video", "who-06-scouts", "who-07-together",
  "post-nash-statline", "post-major-leap", "post-leaders", "post-showcase-home",
];

// PNG dims from the IHDR chunk (bytes 16-23, big-endian).
const pngDims = (buf) => ({ w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) });

const cols = 5, pad = 48, gap = 30, headerH = 130;
const cellW = 340, imgBoxH = 300, labelH = 48, cellH = imgBoxH + labelH;
const present = files.filter((f) => fs.existsSync(path.join(DIR, `${f}.png`)));
const rows = Math.ceil(present.length / cols);
const W = pad * 2 + cols * cellW + (cols - 1) * gap;
const H = pad + headerH + rows * cellH + (rows - 1) * gap + pad;

const C = { orange: "#FF6A1A", text: "#f6f6f4", mut: "#8b929c", panel: "#0F141B", line: "rgba(255,255,255,0.10)" };
let tiles = "";
present.forEach((name, i) => {
  const buf = fs.readFileSync(path.join(DIR, `${name}.png`));
  const { w: iw, h: ih } = pngDims(buf);
  const col = i % cols, row = Math.floor(i / cols);
  const cx = pad + col * (cellW + gap), cy = pad + headerH + row * (cellH + gap);
  const scale = Math.min(cellW / iw, imgBoxH / ih);
  const dw = iw * scale, dh = ih * scale;
  const ix = cx + (cellW - dw) / 2, iy = cy + (imgBoxH - dh) / 2;
  const uri = `data:image/png;base64,${buf.toString("base64")}`;
  tiles += `<rect x="${cx}" y="${cy}" width="${cellW}" height="${cellH}" rx="14" fill="${C.panel}" stroke="${C.line}" stroke-width="1.5"/>
    <image x="${ix}" y="${iy}" width="${dw}" height="${dh}" href="${uri}"/>
    <text x="${cx + cellW / 2}" y="${cy + imgBoxH + 32}" font-family="Hanken Grotesk" font-weight="700" font-size="19" fill="${C.mut}" letter-spacing="1" text-anchor="middle">${name}</text>`;
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${FONT_SD}${FONT_HG}</defs>
  <rect width="${W}" height="${H}" fill="#0B0E13"/>
  <text x="${pad}" y="${pad + 56}" font-family="Oswald" font-weight="800" font-size="56" fill="${C.text}">PROSPERA <tspan fill="${C.orange}">HOOPS</tspan></text>
  <text x="${pad}" y="${pad + 96}" font-family="Hanken Grotesk" font-weight="700" font-size="22" fill="${C.mut}" letter-spacing="2">LAUNCH PACKET · 06.18 · ${present.length} ASSETS</text>
  ${tiles}</svg>`;

const png = new Resvg(svg, { font: { fontBuffers: FONTS, defaultFontFamily: "Hanken Grotesk", loadSystemFonts: false } }).render().asPng();
fs.writeFileSync(path.join(DIR, "contact-sheet.png"), png);
console.log(`✓ ${DIR}/contact-sheet.png  (${W}×${H}, ${present.length} tiles)`);
