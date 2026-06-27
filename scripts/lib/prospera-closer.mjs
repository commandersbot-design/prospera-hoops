// Reusable "Powered by Prospera" closing slide for ANY game-report carousel.
// 1080x1350. The value-pitch every drop should end on.
//
//   import { renderCloser } from "./lib/prospera-closer.mjs";
//   renderCloser("out/9-prospera.png", {
//     team: "HAYFIELD HAWKS",
//     location: "ALEXANDRIA, VA · BOYS BASKETBALL",
//     mark: "brand-kit/hayfield-hawk-white.png",   // optional team logo (white PNG)
//   });
//
// Omit `team` for a generic Prospera-branded closer. Run standalone via
// scripts/gen-prospera-closer.mjs. Edit FEATS below to change the pitch once,
// everywhere.
import { Resvg } from "@resvg/resvg-js";
import fs from "fs";
import path from "path";

const W = 1080, H = 1350;
const SD = "Oswald", HG = "Hanken Grotesk";
const bk = (f) => path.join(process.cwd(), "brand-kit", f);
const ttfBufs = (p) => [...fs.readFileSync(p, "utf8").matchAll(/base64,([A-Za-z0-9+/=]+)\)/g)].map((m) => Buffer.from(m[1], "base64"));
const FONTS = [...ttfBufs(bk("oswald-embed.svgstyle")), ...ttfBufs(bk("hanken-embed.svgstyle"))];
const FONT_SD = fs.readFileSync(bk("oswald-embed.svgstyle"), "utf8");
const FONT_HG = fs.readFileSync(bk("hanken-embed.svgstyle"), "utf8");
const EMBLEM = fs.readFileSync(bk("prospera-emblem.svg"), "utf8").replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const renderPng = (svg) => new Resvg(svg, { font: { fontBuffers: FONTS, defaultFontFamily: HG, loadSystemFonts: false } }).render().asPng();

const C = { panel: "#0F141B", line: "rgba(255,255,255,0.08)", orange: "#FF6A1A", text: "#f6f6f4", mut: "#8b929c", faint: "#5a626c", hawk: "#F4731E", hawk2: "#FF8A3D", sky: "#FF6A1A", skyLine: "rgba(255,106,26,0.32)", ink: "#0B0E13", inkSoft: "rgba(11,14,19,0.70)" };
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const T = (x, y, s, w, fill, txt, o = {}) => `<text x="${x}" y="${y}" font-family="${o.font || HG}" font-weight="${w}" font-size="${s}" fill="${fill}"${o.ls ? ` letter-spacing="${o.ls}"` : ""}${o.anchor ? ` text-anchor="${o.anchor}"` : ""}>${txt}</text>`;
const emblemAt = (x, y, s) => `<g transform="translate(${x},${y})"><svg width="${s}" height="${s}" viewBox="0 0 200 200">${EMBLEM}</svg></g>`;

// The pitch — edit once, changes every future post that imports this.
export const FEATS = [
  ["REAL, VERIFIED STATS", "No fake numbers or invented rankings. Ever."],
  ["FULL GAME-BY-GAME LOGS", "Every game tracked — points, boards, splits, +/-."],
  ["DEVELOPMENT TRACKING", "Height, weight and production charted over time."],
  ["SEEN BY COLLEGE COACHES", "Profiles built to get players to the next level."],
  ["CLAIM YOUR PROFILE — FREE", "Players and parents manage their own page."],
  ["THE DMV'S HOME COURT", "Local high-school and AAU hoops, all in one place."],
];

export function closerSvg({ team = "", location = "", mark = "", eyebrow = "WHAT EVERY PLAYER GETS" } = {}) {
  const defs = `<defs>${FONT_SD}${FONT_HG}
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E1219"/><stop offset="1" stop-color="#080A0E"/></linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.24" r="0.78"><stop offset="0" stop-color="${C.hawk}" stop-opacity="0.16"/><stop offset="1" stop-color="${C.hawk}" stop-opacity="0"/></radialGradient>
    <linearGradient id="band" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.hawk}"/><stop offset="1" stop-color="${C.hawk2}"/></linearGradient></defs>`;
  const markImg = mark && fs.existsSync(mark) ? "data:image/png;base64," + fs.readFileSync(mark).toString("base64") : "";
  const tx = markImg ? 176 : 66;
  const band = `
    <rect x="40" y="150" width="${W - 80}" height="104" rx="18" fill="url(#band)" stroke="rgba(0,0,0,0.22)" stroke-width="1.5"/>
    ${markImg ? `<image href="${markImg}" x="62" y="160" width="94" height="84" preserveAspectRatio="xMidYMid meet"/>` : ""}
    ${T(tx, location ? 196 : 214, 46, 800, C.ink, esc(team || "PROSPERA HOOPS"), { font: SD })}
    ${location ? T(tx, 228, 15, 700, C.inkSoft, esc(location), { ls: 1 }) : ""}
    ${T(W - 64, 214, 17, 800, C.ink, "GAME REPORT", { ls: 2, anchor: "end" })}`;
  const feat = (y, label, sub) =>
    `<rect x="70" y="${y}" width="${W - 140}" height="84" rx="14" fill="${C.panel}" stroke="${C.skyLine}" stroke-width="1.25"/>
     <rect x="70" y="${y}" width="6" height="84" rx="3" fill="${C.hawk}"/>
     ${T(106, y + 37, 25, 800, C.text, esc(label), { font: SD })}
     ${T(106, y + 65, 16.5, 600, C.mut, esc(sub), {})}`;
  let y = 500; const rows = FEATS.map((f) => { const s = feat(y, f[0], f[1]); y += 96; return s; }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}
    <rect width="${W}" height="${H}" fill="url(#bgGrad)"/><rect width="${W}" height="${H}" fill="url(#glow)"/>
    ${emblemAt(40, 36, 60)}
    <text x="116" y="70" font-family="${HG}" font-weight="800" font-size="28"><tspan fill="${C.text}">PROSPERA</tspan><tspan fill="${C.orange}" dx="8">HOOPS</tspan></text>
    ${T(118, 94, 12, 700, C.mut, "DMV HOOPS DATA", { ls: 3 })}
    ${band}
    ${T(W / 2, 356, 22, 800, C.sky, esc(eyebrow), { ls: 5, anchor: "middle" })}
    ${T(W / 2, 426, 56, 800, C.hawk, "POWERED BY PROSPERA", { font: SD, anchor: "middle" })}
    ${rows}
    ${T(W / 2, 1142, 26, 800, C.orange, "Build the profile → ProsperaHoops.com", { anchor: "middle" })}
    ${T(W / 2, 1252, 16, 500, C.faint, "Real stats. Real eyes. The DMV's home court.", { anchor: "middle" })}
    <line x1="44" y1="1276" x2="${W - 44}" y2="1276" stroke="${C.line}" stroke-width="1.5"/>
    ${T(44, 1314, 24, 800, C.orange, "ProsperaHoops.com")}
    ${T(W - 44, 1314, 22, 700, C.mut, "@PROSPERAHOOPS", { ls: 1, anchor: "end" })}
  </svg>`;
}

export function renderCloser(out, opts = {}) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, renderPng(closerSvg(opts)));
  return out;
}
