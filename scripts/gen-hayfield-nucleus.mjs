// Hayfield "THE NUCLEUS" concept card → docs/social-posts/hayfield-nucleus.png
// 1080x1350. Carousel slide 1: the Hawks crest at the core, four players orbiting
// it = one nucleus. Deliberately light on data (the individual cards carry stats).
// Run: node scripts/gen-hayfield-nucleus.mjs
import { Resvg } from "@resvg/resvg-js";
import fs from "fs";
import path from "path";

const OUT = "docs/social-posts";
fs.mkdirSync(OUT, { recursive: true });
const W = 1080, H = 1350;
const C = {
  bg: "#0B0E13", text: "#f6f6f4", mut: "#97a0ad", faint: "#5a626c",
  orange: "#FF6A1A", hawk: "#F4731E", hawk2: "#FF8A3D", ink: "#0B0E13", inkSoft: "rgba(11,14,19,0.72)",
  orbit: "rgba(255,106,26,0.30)", spoke: "rgba(255,106,26,0.45)",
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

const CX = 540, CY = 850, CORE = 116, AV = 86;
const NODES = [
  { last: "TOWE", pos: "PG", file: "public/headshots/christiantowe.jpg", iw: 602, ih: 1024, x: 316, y: 672 },
  { last: "JACKSON", pos: "G", file: "public/headshots/chasejackson.png", iw: 660, ih: 986, x: 764, y: 672 },
  { last: "CAGE", pos: "G", file: "public/headshots/grantcage.png", iw: 660, ih: 980, x: 316, y: 1028 },
  { last: "PAYNE", pos: "G", file: "public/headshots/gavinpayne.jpg", iw: 633, ih: 1024, x: 764, y: 1028 },
];

// fit an image into a box at a zoom, sitting image-point (0.5, focus) at the box
// center — tightens the crop onto the face. Returns {x,y,w,h} for a plain <image>.
function frame(iw, ih, bx, by, bw, bh, zoom, focus, anchorY) {
  const w = bw * zoom, scale = w / iw, h = ih * scale;
  return { x: bx + (bw - w) / 2, y: by + anchorY * bh - focus * h, w, h };
}

const spokes = NODES.map((n) => `<line x1="${CX}" y1="${CY}" x2="${n.x}" y2="${n.y}" stroke="${C.spoke}" stroke-width="2.5"/>`).join("");
const avatar = (n, i) => `<clipPath id="av${i}"><circle cx="${n.x}" cy="${n.y}" r="${AV}"/></clipPath>
  <circle cx="${n.x}" cy="${n.y}" r="${AV + 8}" fill="${C.bg}"/>
  ${(() => { const f = frame(n.iw, n.ih, n.x - AV, n.y - AV, AV * 2, AV * 2, 1.66, 0.27, 0.5); return `<image href="${dataURI(n.file)}" x="${f.x.toFixed(1)}" y="${f.y.toFixed(1)}" width="${f.w.toFixed(1)}" height="${f.h.toFixed(1)}" preserveAspectRatio="none" clip-path="url(#av${i})"/>`; })()}
  <circle cx="${n.x}" cy="${n.y}" r="${AV}" fill="none" stroke="${C.orange}" stroke-width="4"/>
  ${TD(n.x, n.y + AV + 50, 40, 800, C.text, n.last, { anchor: "middle" })}
  ${T(n.x, n.y + AV + 78, 19, 700, C.orange, n.pos, { ls: 3, anchor: "middle" })}`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${FONT_SD}${FONT_HG}
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E1219"/><stop offset="1" stop-color="#080A0E"/></linearGradient>
    <radialGradient id="coreGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${C.hawk}" stop-opacity="0.55"/><stop offset="1" stop-color="${C.hawk}" stop-opacity="0"/></radialGradient>
    <linearGradient id="band" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.hawk}"/><stop offset="1" stop-color="${C.hawk2}"/></linearGradient>
    <radialGradient id="core" cx="0.5" cy="0.42" r="0.65"><stop offset="0" stop-color="${C.hawk2}"/><stop offset="1" stop-color="${C.hawk}"/></radialGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#bgGrad)"/>

  <!-- Hayfield identity band -->
  <rect x="40" y="56" width="${W - 80}" height="104" rx="18" fill="url(#band)" stroke="rgba(0,0,0,0.22)" stroke-width="1.5"/>
  <image href="${HAWK}" x="62" y="70" width="84" height="76" preserveAspectRatio="xMidYMid meet"/>
  ${T(166, 122, 50, 800, C.ink, "HAYFIELD HAWKS", { font: SD })}
  ${T(W - 62, 100, 18, 800, C.ink, "BOYS BASKETBALL", { ls: 2, anchor: "end" })}
  ${T(W - 62, 130, 15, 700, C.inkSoft, "Alexandria, VA", { ls: 1, anchor: "end" })}

  <!-- Title -->
  ${TD(CX, 312, 132, 800, C.text, "THE NUCLEUS", { anchor: "middle" })}
  ${T(CX, 364, 24, 800, C.orange, "FOUR HAWKS · ONE CORE", { ls: 6, anchor: "middle" })}

  <!-- Orbit + spokes + core -->
  <ellipse cx="${CX}" cy="${CY}" rx="300" ry="250" fill="none" stroke="${C.orbit}" stroke-width="2"/>
  <ellipse cx="${CX}" cy="${CY}" rx="232" ry="300" fill="none" stroke="${C.orbit}" stroke-width="1.5" stroke-dasharray="3 9"/>
  ${spokes}
  <circle cx="${CX}" cy="${CY}" r="${CORE + 46}" fill="url(#coreGlow)"/>
  <circle cx="${CX}" cy="${CY}" r="${CORE}" fill="url(#core)" stroke="${C.ink}" stroke-width="2"/>
  <image href="${HAWK}" x="${CX - 96}" y="${CY - 80}" width="192" height="160" preserveAspectRatio="xMidYMid meet"/>

  <!-- Player nodes -->
  ${NODES.map(avatar).join("")}

  <!-- Footer -->
  <line x1="44" y1="1280" x2="${W - 44}" y2="1280" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>
  ${T(44, 1318, 24, 800, C.orange, "ProsperaHoops.com")}
  ${T(W - 44, 1318, 22, 700, C.mut, "@PROSPERAHOOPS", { ls: 1, anchor: "end" })}
</svg>`;

fs.writeFileSync(path.join(OUT, "hayfield-nucleus.png"), renderPng(svg));
console.log(`nucleus card → ${OUT}/hayfield-nucleus.png`);
