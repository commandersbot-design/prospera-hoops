// Individual Hayfield Hawks player cards (one per player, with headshot).
// 1080x1350 · orange/black Hawks identity + real headshot + real stat line.
// Headshots embedded as data-URIs (resvg can't fetch URLs). Capitol Hoops lines
// are summer-league averages; Payne headlines his VHSL Live game high, tagged
// separately. Run: node scripts/gen-hayfield-players.mjs
import { Resvg } from "@resvg/resvg-js";
import fs from "fs";
import path from "path";

const OUT = "docs/social-posts";
fs.mkdirSync(OUT, { recursive: true });
const W = 1080, H = 1350;
const C = {
  bg: "#0B0E13", panel: "#0F141B", line: "rgba(255,255,255,0.08)",
  orange: "#FF6A1A", text: "#f6f6f4", mut: "#97a0ad", faint: "#5a626c",
  hawk: "#F4731E", hawk2: "#FF8A3D", ink: "#0B0E13", inkSoft: "rgba(11,14,19,0.72)",
};
const SD = "Oswald", HG = "Hanken Grotesk";
const ttfBufs = (p) => [...fs.readFileSync(p, "utf8").matchAll(/base64,([A-Za-z0-9+/=]+)\)/g)].map((m) => Buffer.from(m[1], "base64"));
const FONTS = [...ttfBufs("brand-kit/oswald-embed.svgstyle"), ...ttfBufs("brand-kit/hanken-embed.svgstyle")];
const FONT_SD = fs.readFileSync("brand-kit/oswald-embed.svgstyle", "utf8");
const FONT_HG = fs.readFileSync("brand-kit/hanken-embed.svgstyle", "utf8");
const renderPng = (svg) => new Resvg(svg, { font: { fontBuffers: FONTS, defaultFontFamily: "Hanken Grotesk", loadSystemFonts: false } }).render().asPng();
const HAWK = "data:image/png;base64," + fs.readFileSync("brand-kit/hayfield-hawk-black.png").toString("base64");
const dataURI = (f) => { const ext = path.extname(f).slice(1).toLowerCase(); const mime = ext === "jpg" ? "jpeg" : ext; return `data:image/${mime};base64,` + fs.readFileSync(f).toString("base64"); };
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const T = (x, y, s, w, fill, txt, o = {}) => `<text x="${x}" y="${y}" font-family="${o.font || HG}" font-weight="${w}" font-size="${s}" fill="${fill}"${o.ls ? ` letter-spacing="${o.ls}"` : ""}${o.anchor ? ` text-anchor="${o.anchor}"` : ""}>${esc(txt)}</text>`;
const TD = (x, y, s, w, fill, txt, o = {}) => T(x, y, s, w, fill, txt, { ...o, font: SD });

// players — stats shown are curated; Capitol Hoops = summer avgs, Payne = VHSL Live game.
const PLAYERS = [
  { id: "christiantowe", file: "public/headshots/christiantowe.jpg", name: "CHRISTIAN TOWE", meta: "PG · #1 · HAYFIELD HAWKS",
    mode: "avg", stats: [{ v: "20.0", l: "PPG", hot: true }, { v: "7.3", l: "RPG" }, { v: "3.3", l: "APG" }],
    tag: "CAPITOL HOOPS", note: "Capitol Hoops Summer League · 3 GP" },
  { id: "chasejackson", file: "public/headshots/chasejackson.png", name: "CHASE JACKSON", meta: "G · HAYFIELD HAWKS",
    mode: "avg", stats: [{ v: "16.2", l: "PPG", hot: true }, { v: "39.5%", l: "3PT" }, { v: "6.0", l: "RPG" }],
    tag: "CAPITOL HOOPS", note: "Capitol Hoops Summer League · 6 GP" },
  { id: "grantcage", file: "public/headshots/grantcage.png", name: "GRANT CAGE", meta: "G · HAYFIELD HAWKS",
    mode: "avg", stats: [{ v: "10.2", l: "PPG", hot: true }, { v: "4.8", l: "RPG" }, { v: "3.0", l: "APG" }],
    tag: "CAPITOL HOOPS", note: "Capitol Hoops Summer League · 6 GP" },
  { id: "gavinpayne", file: "public/headshots/gavinpayne.jpg", name: "GAVIN PAYNE", meta: "G · HAYFIELD HAWKS",
    mode: "game", big: "19", bigUnit: "PTS", ctx: "GAME HIGH · W vs YORKTOWN",
    tag: "VHSL LIVE", note: "VHSL Live game high · summer avg 4.4 PPG (Capitol Hoops)" },
];

const tagPill = (cx, y, txt) => { const fs = 20, w = txt.length * (fs * 0.6) + 46; return `<rect x="${cx - w / 2}" y="${y - fs - 3}" width="${w}" height="${fs + 16}" rx="${(fs + 16) / 2}" fill="none" stroke="${C.orange}" stroke-width="2"/>${T(cx, y, fs, 800, C.orange, txt, { ls: 2, anchor: "middle" })}`; };

function statBlock(p) {
  if (p.mode === "game") {
    return `${TD(W / 2, 1085, 168, 800, C.orange, p.big, { anchor: "middle" })}
      ${T(W / 2 + 150, 1085, 34, 800, C.mut, p.bigUnit, { anchor: "middle" })}
      ${T(W / 2, 1140, 26, 700, C.text, p.ctx, { ls: 2, anchor: "middle" })}`;
  }
  const cx = [248, 540, 832];
  return p.stats.map((s, i) => `${TD(cx[i], 1070, 96, 800, s.hot ? C.orange : C.text, s.v, { anchor: "middle" })}
    ${T(cx[i], 1118, 24, 800, C.mut, s.l, { ls: 3, anchor: "middle" })}`).join("")
    + `<line x1="${cx[0] + 90}" y1="1030" x2="${cx[0] + 90}" y2="1095" stroke="${C.line}" stroke-width="1.5"/><line x1="${cx[1] + 90}" y1="1030" x2="${cx[1] + 90}" y2="1095" stroke="${C.line}" stroke-width="1.5"/>`;
}

function card(p) {
  const photoH = 902;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>${FONT_SD}${FONT_HG}
      <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B0E13" stop-opacity="0"/><stop offset="0.62" stop-color="#0B0E13" stop-opacity="0.55"/><stop offset="1" stop-color="#0B0E13" stop-opacity="1"/></linearGradient>
      <linearGradient id="band" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.hawk}"/><stop offset="1" stop-color="${C.hawk2}"/></linearGradient>
      <clipPath id="photo"><rect x="0" y="0" width="${W}" height="${photoH}"/></clipPath></defs>
    <rect width="${W}" height="${H}" fill="${C.bg}"/>

    <image href="${dataURI(p.file)}" x="0" y="0" width="${W}" height="${photoH}" preserveAspectRatio="xMidYMin slice" clip-path="url(#photo)"/>
    <rect x="0" y="470" width="${W}" height="${photoH - 470}" fill="url(#fade)"/>

    <rect x="0" y="0" width="${W}" height="104" fill="url(#band)"/>
    <image href="${HAWK}" x="34" y="16" width="84" height="76" preserveAspectRatio="xMidYMid meet"/>
    ${T(138, 67, 46, 800, C.ink, "HAYFIELD HAWKS", { font: SD })}
    ${T(W - 40, 60, 18, 800, C.ink, "THE NUCLEUS", { ls: 2, anchor: "end" })}

    ${TD(60, 812, 104, 800, C.text, p.name)}
    ${T(64, 864, 28, 700, C.orange, p.meta, { ls: 1 })}

    ${statBlock(p)}

    ${tagPill(W / 2, 1210, p.tag)}
    ${T(W / 2, 1252, 17, 500, C.faint, p.note, { anchor: "middle" })}
    <line x1="44" y1="1278" x2="${W - 44}" y2="1278" stroke="${C.line}" stroke-width="1.5"/>
    ${T(44, 1316, 24, 800, C.orange, "ProsperaHoops.com")}
    ${T(W - 44, 1316, 22, 700, C.mut, "@PROSPERAHOOPS", { ls: 1, anchor: "end" })}
  </svg>`;
}

for (const p of PLAYERS) {
  fs.writeFileSync(path.join(OUT, `hayfield-card-${p.id}.png`), renderPng(card(p)));
}
console.log(`hayfield player cards → ${OUT}/hayfield-card-{${PLAYERS.map((p) => p.id).join(",")}}.png`);
