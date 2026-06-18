// Launch-day "WHO IT'S FOR" carousel + HOME feed graphic (Thu 6/18).
// Audience slides — Players, Coaches, Media/Photographers, Videographers,
// Scouts-at-large — each with a "what you get / how you help" value exchange,
// plus the SEEN · TRACKED · HOME finale as a feed graphic. Same brand pipeline
// as gen-launch-day.mjs (1080×1350, Oswald + Hanken embedded, emblem, Resvg).
// Run: node scripts/gen-launch-packet.mjs
import { Resvg } from "@resvg/resvg-js";
import fs from "fs";
import path from "path";

const OUT = "docs/social-posts";
fs.mkdirSync(OUT, { recursive: true });
const W = 1080, H = 1350;
const C = { bg: "#0B0E13", panel: "#0F141B", line: "rgba(255,255,255,0.08)", orange: "#FF6A1A", text: "#f6f6f4", mut: "#8b929c", faint: "#5a626c", teal: "#2FBF8F", blue: "#3B9EFF", pink: "#FF7AB6", purple: "#9B8CFF", li: "#d6dade" };
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
const defs = `<defs>${FONT_SD}${FONT_HG}
  <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E1219"/><stop offset="1" stop-color="#080A0E"/></linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.26" r="0.7"><stop offset="0" stop-color="${C.orange}" stop-opacity="0.16"/><stop offset="1" stop-color="${C.orange}" stop-opacity="0"/></radialGradient>
  <linearGradient id="band" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FF6A1A"/><stop offset="1" stop-color="#FF8A3D"/></linearGradient></defs>`;
const header = (tag) => `${emblemAt(40, 36, 60)}
  <text x="116" y="70" font-family="${HG}" font-weight="800" font-size="28"><tspan fill="${C.text}">PROSPERA</tspan><tspan fill="${C.orange}" dx="8">HOOPS</tspan></text>
  ${T(118, 94, 12, 700, C.mut, "DMV HOOPS DATA", { ls: 3 })}
  ${tag ? T(W - 40, 70, 18, 700, C.orange, tag, { ls: 2, anchor: "end" }) : ""}`;
const footer = (l = "ProsperaHoops.com", r = "@PROSPERAHOOPS") => `<line x1="44" y1="1276" x2="${W - 44}" y2="1276" stroke="${C.line}" stroke-width="1.5"/>
  ${T(44, 1314, 24, 800, C.orange, l)}
  ${T(W - 44, 1314, 22, 700, C.mut, r, { ls: 1, anchor: "end" })}`;
function card(name, body) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}
    <rect width="${W}" height="${H}" fill="url(#bgGrad)"/><rect width="${W}" height="${H}" fill="url(#glow)"/>${body}</svg>`;
  fs.writeFileSync(path.join(OUT, `${name}.png`), renderPng(svg));
  console.log(`✓ ${OUT}/${name}.png`);
}
const pillars = (cy, active) => {
  const col = (p) => (p === active ? C.orange : "rgba(246,246,244,0.30)");
  return `<text x="${W / 2}" y="${cy}" font-family="${SD}" font-weight="700" font-size="40" letter-spacing="6" text-anchor="middle"><tspan fill="${col("SEEN")}">SEEN</tspan><tspan fill="rgba(246,246,244,0.22)">   ·   </tspan><tspan fill="${col("TRACKED")}">TRACKED</tspan><tspan fill="rgba(246,246,244,0.22)">   ·   </tspan><tspan fill="${col("HOME")}">HOME</tspan></text>`;
};
const bullet = (y, accent, filled) => filled
  ? `<rect x="40" y="${y - 16}" width="14" height="14" rx="3" fill="${accent}"/>`
  : `<rect x="41" y="${y - 15}" width="12" height="12" rx="3" fill="none" stroke="${accent}" stroke-width="2"/>`;

// ===================================================== audience value-exchange slide
function audience(name, { num, label, head, get, help, accent, tag }) {
  const body = `${header("")}
    ${T(40, 150, 22, 800, accent, num, { ls: 2 })}<text x="84" y="150" font-family="${HG}" font-weight="700" font-size="22" fill="${C.faint}" letter-spacing="2">/ 07</text>
    ${T(40, 256, 24, 800, accent, esc(label), { ls: 5 })}
    ${head.map((ln, i) => TD(40, 344 + i * 84, 76, 800, C.text, esc(ln))).join("")}
    ${T(40, 556, 22, 800, accent, "WHAT YOU GET", { ls: 4 })}
    ${get.map((ln, i) => { const y = 612 + i * 56; return bullet(y, accent, true) + T(72, y, 27, 500, C.li, esc(ln)); }).join("")}
    ${T(40, 838, 22, 800, accent, "HOW YOU HELP US", { ls: 4 })}
    ${help.map((ln, i) => { const y = 894 + i * 56; return bullet(y, accent, false) + T(72, y, 27, 500, C.li, esc(ln)); }).join("")}
    ${tag ? `<rect x="40" y="1066" width="${tag.length * 16 + 56}" height="62" rx="14" fill="${C.panel}" stroke="${accent}" stroke-opacity="0.4" stroke-width="1.5"/>${T(68, 1106, 26, 700, accent, esc(tag), { ls: 1 })}` : ""}
    ${footer("SWIPE TO CONTINUE", "@PROSPERAHOOPS")}`;
  card(name, body);
}

// 01 — cover
card("who-01-cover", `${header("WHO IT'S FOR")}
  ${T(W / 2, 300, 26, 800, C.orange, "WHO IT'S FOR", { ls: 8, anchor: "middle" })}
  ${TD(W / 2, 480, 150, 800, C.text, "FIND YOUR", { anchor: "middle" })}
  ${TD(W / 2, 628, 150, 800, C.orange, "LANE.", { anchor: "middle" })}
  ${T(W / 2, 720, 29, 600, C.mut, "Everyone who makes DMV hoops matter —", { anchor: "middle" })}
  ${T(W / 2, 760, 29, 600, C.mut, "and everyone we're building this with.", { anchor: "middle" })}
  ${T(W / 2, 904, 26, 800, C.text, "PLAYERS · COACHES · MEDIA", { ls: 2, anchor: "middle" })}
  ${T(W / 2, 950, 26, 800, C.text, "VIDEOGRAPHERS · SCOUTS", { ls: 2, anchor: "middle" })}
  ${T(W / 2, 1066, 25, 600, C.mut, "Prospera gets sharper with every one of you.", { anchor: "middle" })}
  ${footer("SWIPE TO SEE YOUR LANE", "@PROSPERAHOOPS")}`);

// 02 — players
audience("who-02-players", {
  num: "02", label: "FOR PLAYERS", accent: C.orange,
  head: ["GET SEEN.", "GET RECRUITED."],
  get: ["Exposure to college coaches — see who viewed you", "A verified profile that's yours, free forever", "Your stats, film & recruiting info in one place"],
  help: ["Claim your profile & keep your stats honest", "Add your film and bring your teammates on"],
  tag: "CLAIM YOUR PROFILE — FREE",
});

// 03 — coaches
audience("who-03-coaches", {
  num: "03", label: "FOR COACHES", accent: C.blue,
  head: ["SCOUT THE", "WHOLE REGION."],
  get: ["Coach HQ — real data on every DMV team", "Opponent game plans & your-team analytics", "Free your first year, built for the sideline"],
  help: ["Verify your roster & confirm real stats", "Flag players we're missing — shape the tools"],
  tag: "COACH HQ — FREE YEAR ONE",
});

// 04 — media / photographers
audience("who-04-media", {
  num: "04", label: "FOR MEDIA & PHOTOGRAPHERS", accent: C.teal,
  head: ["YOUR LENS.", "EVERY PROFILE."],
  get: ["Your photos on profiles every recruit sees", "Credit & a byline that reaches the DMV", "Discovered by players, parents & college coaches"],
  help: ["Headshots & game photos that make profiles pop", "Coverage that keeps Prospera current"],
  tag: "GET FEATURED · GET CREDITED",
});

// 05 — videographers
audience("who-05-video", {
  num: "05", label: "FOR VIDEOGRAPHERS", accent: C.pink,
  head: ["YOUR FILM.", "DISCOVERED."],
  get: ["Highlight reels linked on player profiles", "Credit on every clip, seen by recruiters", "A home for the footage coaches actually want"],
  help: ["Game film & highlights that bring profiles alive", "The immersive layer that sets Prospera apart"],
  tag: "LINK YOUR FILM · GET CREDITED",
});

// 06 — scouts at large
audience("who-06-scouts", {
  num: "06", label: "FOR SCOUTS AT LARGE", accent: C.purple,
  head: ["YOUR EYE.", "OUR NETWORK."],
  get: ["A credentialed scout byline on Prospera", "Connections across DMV programs & coaches", "Your read in front of the people who matter"],
  help: ["Surface players we're not yet tracking", "Honest, on-the-ground reads that keep us real"],
  tag: "JOIN THE SCOUT NETWORK",
});

// 07 — let's build it together (CTA)
card("who-07-together", `${header("WHO IT'S FOR")}
  ${T(W / 2, 320, 24, 800, C.orange, "LET'S BUILD IT", { ls: 6, anchor: "middle" })}
  ${TD(W / 2, 500, 124, 800, C.text, "TOGETHER.", { anchor: "middle" })}
  ${T(W / 2, 612, 29, 600, C.mut, "Prospera is the DMV's home court — and it gets", { anchor: "middle" })}
  ${T(W / 2, 652, 29, 600, C.mut, "sharper, deeper, and more immersive with every", { anchor: "middle" })}
  ${T(W / 2, 692, 29, 600, C.mut, "player, coach, lens, and scout who joins.", { anchor: "middle" })}
  ${T(W / 2, 820, 28, 800, C.text, "FIND YOUR LANE. GET IN EARLY.", { ls: 2, anchor: "middle" })}
  <rect x="${W / 2 - 250}" y="900" width="500" height="86" rx="43" fill="url(#band)"/>
  ${T(W / 2, 956, 34, 800, C.bg, "PROSPERAHOOPS.COM", { ls: 1, anchor: "middle" })}
  ${T(W / 2, 1066, 25, 600, C.mut, "Want in? DM us @prosperahoops or claim your profile.", { anchor: "middle" })}
  ${footer()}`);

// ===================================================== SEEN · TRACKED · HOME feed
card("packet-home", `${header("06.18 · LIVE")}
  ${TD(W / 2, 470, 150, 800, C.text, "THIS IS", { anchor: "middle" })}
  ${TD(W / 2, 620, 150, 800, C.orange, "HOME.", { anchor: "middle" })}
  ${T(W / 2, 706, 29, 600, C.mut, "Every DMV hooper. One place. Real data.", { anchor: "middle" })}
  ${pillars(836, "HOME")}
  ${T(W / 2, 1006, 27, 700, C.text, "Search your name. Claim your profile. Free.", { anchor: "middle" })}
  <rect x="${W / 2 - 250}" y="1060" width="500" height="86" rx="43" fill="url(#band)"/>
  ${T(W / 2, 1116, 34, 800, C.bg, "PROSPERAHOOPS.COM", { ls: 1, anchor: "middle" })}
  ${footer()}`);

console.log("\nLaunch packet (WHO IT'S FOR + HOME) complete → docs/social-posts/");
