// Generate launch marketing assets → docs/launch-assets/
//   qr-prosperahoops.png  raw QR to prosperahoops.com (graphite on white, ECC H)
//   qr-flyer.png          print/show-at-games flyer (branded, "scan to claim")
//   founding-player-badge.png  the Founding 100 seal
//   launch-announce.png   1080x1350 "live Wednesday" reveal
// Run: npm install qrcode --no-save && node scripts/gen-launch-assets.mjs
//
// Brand line: hook "Proof over hype." + CTA "Track it. Prove it. Get recruited."
import sharp from "sharp";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

const OUT = "docs/launch-assets";
fs.mkdirSync(OUT, { recursive: true });
const SITE = "https://www.prosperahoops.com";
const C = { bg: "#0B0E13", panel: "#12161C", orange: "#FF6A1A", rust: "#C24A14", text: "#f6f6f4", mut: "#9aa0a8", hair: "rgba(255,255,255,0.10)" };
const SA = '"Saira Condensed", sans-serif';
const FONT = (fs.readFileSync("public/brand/svg/prosperahoops-wordmark-dark.svg", "utf8").match(/<style[\s\S]*?<\/style>/) || [""])[0];
const EMBLEM = fs.readFileSync("brand-kit/prospera-emblem.svg", "utf8");
const emblemInner = EMBLEM.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

// --- shared design system ---------------------------------------------------
const defs = `<defs>${FONT}
  <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E1219"/><stop offset="1" stop-color="#080A0E"/></linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.26" r="0.72"><stop offset="0" stop-color="#FF6A1A" stop-opacity="0.16"/><stop offset="1" stop-color="#FF6A1A" stop-opacity="0"/></radialGradient>
  <radialGradient id="vig" cx="0.5" cy="0.5" r="0.78"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.6"/></radialGradient>
  <linearGradient id="coin" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#FF8A3D"/><stop offset="1" stop-color="${C.rust}"/></linearGradient></defs>`;
const bg = (w, h) => `<rect width="${w}" height="${h}" fill="url(#bgGrad)"/><rect width="${w}" height="${h}" fill="url(#glow)"/>`;
const vig = (w, h) => `<rect width="${w}" height="${h}" fill="url(#vig)"/>`;
// signature rising bar-ramp + ball motif (background energy)
const cluster = (x, y, s, op) => `<g transform="translate(${x},${y}) scale(${s})" opacity="${op}">
  <rect x="0" y="60" width="26" height="60" rx="4" fill="#9A3E12"/><rect x="34" y="36" width="26" height="84" rx="4" fill="#C24A14"/>
  <rect x="68" y="12" width="26" height="108" rx="4" fill="#E0531B"/><rect x="102" y="34" width="26" height="86" rx="4" fill="#FF6A1A"/>
  <circle cx="115" cy="-2" r="26" fill="#FF6A1A"/></g>`;
const emblemAt = (cx, y, size) => `<g transform="translate(${cx - size / 2},${y})"><svg width="${size}" height="${size}" viewBox="0 0 200 200">${emblemInner}</svg></g>`;
const lockup = (cx, y, s) => `<text x="${cx}" y="${y}" font-family='${SA}' font-weight="800" font-size="${s}" letter-spacing="2" text-anchor="middle"><tspan fill="${C.text}">PROSPERA</tspan><tspan fill="${C.orange}">HOOPS</tspan></text>`;
const rule = (cx, y, w) => `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="5" rx="2.5" fill="${C.orange}"/>`;
// Saira Condensed bold renders at ~0.62 char-aspect; size pills generously so text never clips.
const chip = (cx, y, text, fs = 22, ls = 4) => {
  const w = text.length * (fs * 0.60 + ls) + 60;
  return `<rect x="${cx - w / 2}" y="${y - fs - 4}" width="${w}" height="${fs + 16}" rx="${(fs + 16) / 2}" fill="rgba(255,106,26,0.10)" stroke="${C.orange}" stroke-width="1.5"/>
  <text x="${cx}" y="${y}" font-family='${SA}' font-weight="700" font-size="${fs}" letter-spacing="${ls}" fill="${C.orange}" text-anchor="middle">${text}</text>`;
};
const pill = (cx, y, text, fs = 30, ls = 3) => {
  const w = text.length * (fs * 0.62 + ls) + 80;
  return `<rect x="${cx - w / 2}" y="${y - fs - 8}" width="${w}" height="${fs + 26}" rx="${(fs + 26) / 2}" fill="${C.orange}"/>
  <text x="${cx}" y="${y}" font-family='${SA}' font-weight="800" font-size="${fs}" letter-spacing="${ls}" fill="${C.bg}" text-anchor="middle">${text}</text>`;
};
const png = (svg, w, h, file) => sharp(Buffer.from(svg)).resize(w, h).png().toFile(path.join(OUT, file));

async function run() {
  // 1) raw QR
  await QRCode.toFile(path.join(OUT, "qr-prosperahoops.png"), SITE, { width: 1000, margin: 2, errorCorrectionLevel: "H", color: { dark: "#0B0E13", light: "#FFFFFF" } });

  // 2) Launch announce (1080x1350) — hook-led reveal
  const W = 1080, H = 1350;
  const announce = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}
    ${bg(W, H)}
    ${cluster(-30, 1180, 2.6, 0.10)}${cluster(820, 90, 2.2, 0.08)}
    ${emblemAt(W / 2, 84, 132)}
    ${lockup(W / 2, 290, 46)}
    <g transform="translate(0,28)">
      ${chip(W / 2, 360, "DC · MD · VA  ·  HIGH SCHOOL + AAU", 22, 4)}
      <text x="${W / 2}" y="600" font-family='${SA}' font-weight="800" font-size="150" letter-spacing="1" fill="${C.text}" text-anchor="middle">PROOF OVER</text>
      <text x="${W / 2}" y="745" font-family='${SA}' font-weight="800" font-size="150" letter-spacing="1" fill="${C.orange}" text-anchor="middle">HYPE.</text>
      ${rule(W / 2, 800, 120)}
      <text x="${W / 2}" y="905" font-family='${SA}' font-weight="700" font-size="42" fill="${C.text}" text-anchor="middle">Every DMV hooper, finally tracked.</text>
      <text x="${W / 2}" y="958" font-family='${SA}' font-weight="700" font-size="38" fill="${C.mut}" text-anchor="middle">Real stats. Honest evals. Your recruiting home — free.</text>
      ${pill(W / 2, 1110, "LIVE WEDNESDAY", 44, 5)}
    </g>
    <text x="${W / 2}" y="1290" font-family='${SA}' font-weight="700" font-size="38" letter-spacing="4" fill="${C.text}" text-anchor="middle">PROSPERAHOOPS.COM</text>
    ${vig(W, H)}</svg>`;
  await png(announce, W, H, "launch-announce.png");

  // 3) QR flyer (1080x1350) — action-led, QR composited
  const fw = 1080, fh = 1350;
  const flyer = `<svg xmlns="http://www.w3.org/2000/svg" width="${fw}" height="${fh}" viewBox="0 0 ${fw} ${fh}">${defs}
    ${bg(fw, fh)}
    ${cluster(-40, 1150, 2.4, 0.09)}${cluster(840, 70, 2.0, 0.07)}
    ${emblemAt(fw / 2, 70, 116)}
    ${lockup(fw / 2, 256, 44)}
    ${chip(fw / 2, 322, "TRACK IT.  PROVE IT.  GET RECRUITED.", 22, 3)}
    <rect x="${fw / 2 - 300}" y="400" width="600" height="600" rx="30" fill="#FFFFFF"/>
    ${[[fw / 2 - 300, 400, 1, 1], [fw / 2 + 300, 400, -1, 1], [fw / 2 - 300, 1000, 1, -1], [fw / 2 + 300, 1000, -1, -1]].map(([x, y, sx, sy]) => `<path d="M ${x + sx * 6} ${y + sy * 56} L ${x + sx * 6} ${y + sy * 6} L ${x + sx * 56} ${y + sy * 6}" fill="none" stroke="${C.orange}" stroke-width="8" stroke-linecap="round"/>`).join("")}
    <text x="${fw / 2}" y="1090" font-family='${SA}' font-weight="800" font-size="70" fill="${C.text}" text-anchor="middle">SCAN TO CLAIM</text>
    <text x="${fw / 2}" y="1158" font-family='${SA}' font-weight="800" font-size="70" fill="${C.orange}" text-anchor="middle">YOUR FREE PROFILE</text>
    <text x="${fw / 2}" y="1218" font-family='${SA}' font-weight="700" font-size="30" fill="${C.mut}" text-anchor="middle">Real stats. Honest evals. First 100 = Founding Player.</text>
    <text x="${fw / 2}" y="1300" font-family='${SA}' font-weight="700" font-size="34" letter-spacing="3" fill="${C.text}" text-anchor="middle">PROSPERAHOOPS.COM</text>
    ${vig(fw, fh)}</svg>`;
  const flyerBase = await sharp(Buffer.from(flyer)).png().toBuffer();
  const qrBuf = await sharp(path.join(OUT, "qr-prosperahoops.png")).resize(540, 540).toBuffer();
  await sharp(flyerBase).composite([{ input: qrBuf, top: 430, left: Math.round(fw / 2 - 270) }]).png().toFile(path.join(OUT, "qr-flyer.png"));

  // 4) Founding Player seal (512) — double ring + circular text + star center
  const S = 512, cx = 256, cy = 256;
  const star = (x, y, r) => { let p = ""; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? r * 0.42 : r; p += `${i ? "L" : "M"}${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`; } return `<path d="${p}Z" fill="${C.orange}"/>`; };
  const badge = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${defs}
    <circle cx="${cx}" cy="${cy}" r="248" fill="${C.bg}"/>
    <circle cx="${cx}" cy="${cy}" r="246" fill="none" stroke="${C.orange}" stroke-width="5"/>
    <circle cx="${cx}" cy="${cy}" r="214" fill="none" stroke="${C.orange}" stroke-width="2" stroke-opacity="0.55"/>
    ${star(cx, 168, 30)}
    <text x="${cx}" y="270" font-family='${SA}' font-weight="800" font-size="58" fill="${C.text}" text-anchor="middle">FOUNDING</text>
    <text x="${cx}" y="326" font-family='${SA}' font-weight="800" font-size="58" fill="${C.orange}" text-anchor="middle">PLAYER</text>
    <rect x="${cx - 50}" y="350" width="100" height="3" rx="1.5" fill="${C.orange}"/>
    <text x="${cx}" y="392" font-family='${SA}' font-weight="700" font-size="26" letter-spacing="5" fill="${C.mut}" text-anchor="middle">EST. 2026</text>
  </svg>`;
  await png(badge, S, S, "founding-player-badge.png");

  console.log("launch assets (v2) → docs/launch-assets/: qr-prosperahoops, qr-flyer, founding-player-badge, launch-announce");
}
run();
