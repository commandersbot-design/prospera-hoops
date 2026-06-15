// Generate launch marketing assets → docs/launch-assets/
//   qr-prosperahoops.png  raw QR to prosperahoops.com (graphite on white, ECC H)
//   qr-flyer.png          print/show-at-games flyer (branded, "scan to claim")
//   founding-player-badge.png  the Founding 100 badge
//   launch-announce.png   1080x1350 "arrives Wednesday" reveal graphic
// Run: npm install qrcode --no-save && node scripts/gen-launch-assets.mjs
import sharp from "sharp";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

const OUT = "docs/launch-assets";
fs.mkdirSync(OUT, { recursive: true });

const SITE = "https://www.prosperahoops.com";
const C = { bg: "#0B0E13", panel: "#12161C", orange: "#FF6A1A", rust: "#C24A14", text: "#f6f6f4", mut: "#9a9ca2", hair: "rgba(255,255,255,0.10)" };
const SA = '"Saira Condensed", sans-serif';
const FONT = (fs.readFileSync("public/brand/svg/prosperahoops-wordmark-dark.svg", "utf8").match(/<style[\s\S]*?<\/style>/) || [""])[0];
const EMBLEM = fs.readFileSync("brand-kit/prospera-emblem.svg", "utf8").replace(/<\?xml[^>]*>/, "");
const lockupText = (cx, y, s) => `<text x="${cx}" y="${y}" font-family='${SA}' font-weight="800" font-size="${s}" letter-spacing="2" text-anchor="middle"><tspan fill="${C.text}">PROSPERA </tspan><tspan fill="${C.orange}">HOOPS</tspan></text>`;
const png = (svg, w, h, file) => sharp(Buffer.from(svg)).resize(w, h).png().toFile(path.join(OUT, file));

// emblem as a nested <svg> at (x,y,size)
const emblemAt = (x, y, size) => `<g transform="translate(${x},${y})"><svg width="${size}" height="${size}" viewBox="0 0 200 200">${EMBLEM.replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "")}</svg></g>`;

async function run() {
  // 1) raw QR — graphite modules on white, high error correction (survives print)
  await QRCode.toFile(path.join(OUT, "qr-prosperahoops.png"), SITE, { width: 1000, margin: 2, errorCorrectionLevel: "H", color: { dark: "#0B0E13", light: "#FFFFFF" } });

  // 2) QR flyer (1080x1350) — branded, QR composited center
  const fw = 1080, fh = 1350;
  const flyerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${fw}" height="${fh}" viewBox="0 0 ${fw} ${fh}"><defs>${FONT}</defs>
    <rect width="${fw}" height="${fh}" fill="${C.bg}"/>
    ${emblemAt(fw/2-70, 70, 140)}
    ${lockupText(fw/2, 290, 56)}
    <text x="${fw/2}" y="360" font-family='${SA}' font-weight="700" font-size="30" letter-spacing="6" fill="${C.mut}" text-anchor="middle">DC · MD · VA BASKETBALL</text>
    <rect x="${fw/2-310}" y="430" width="620" height="620" rx="28" fill="#FFFFFF"/>
    <text x="${fw/2}" y="1100" font-family='${SA}' font-weight="800" font-size="64" fill="${C.text}" text-anchor="middle">SCAN TO CLAIM</text>
    <text x="${fw/2}" y="1165" font-family='${SA}' font-weight="800" font-size="64" fill="${C.orange}" text-anchor="middle">YOUR FREE PROFILE</text>
    <text x="${fw/2}" y="1228" font-family='${SA}' font-weight="700" font-size="30" fill="${C.text}" text-anchor="middle">Real stats. Honest evals. Your recruiting home.</text>
    <text x="${fw/2}" y="1305" font-family='${SA}' font-weight="700" font-size="34" letter-spacing="3" fill="${C.mut}" text-anchor="middle">PROSPERAHOOPS.COM</text>
  </svg>`;
  const flyerBase = await sharp(Buffer.from(flyerSvg)).png().toBuffer();
  const qrBuf = await sharp(path.join(OUT, "qr-prosperahoops.png")).resize(560, 560).toBuffer();
  await sharp(flyerBase).composite([{ input: qrBuf, top: 460, left: Math.round(fw/2 - 280) }]).png().toFile(path.join(OUT, "qr-flyer.png"));

  // 3) Founding Player badge (512) — orange disc, dark text, star
  const star = (cx, cy, r, fill) => { let p = ""; for (let i = 0; i < 10; i++) { const ang = -Math.PI/2 + i*Math.PI/5; const rr = i%2 ? r*0.42 : r; p += `${i?"L":"M"}${(cx+rr*Math.cos(ang)).toFixed(1)},${(cy+rr*Math.sin(ang)).toFixed(1)}`; } return `<path d="${p}Z" fill="${fill}"/>`; };
  const badge = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><defs>${FONT}
    <radialGradient id="o" cx="0.5" cy="0.4" r="0.7"><stop offset="0" stop-color="#FF7A2E"/><stop offset="1" stop-color="${C.rust}"/></radialGradient></defs>
    <circle cx="256" cy="256" r="248" fill="${C.bg}"/>
    <circle cx="256" cy="256" r="232" fill="url(#o)"/>
    <circle cx="256" cy="256" r="232" fill="none" stroke="${C.bg}" stroke-width="10"/>
    ${star(256, 150, 46, C.bg)}
    <text x="256" y="290" font-family='${SA}' font-weight="800" font-size="62" fill="${C.bg}" text-anchor="middle">FOUNDING</text>
    <text x="256" y="350" font-family='${SA}' font-weight="800" font-size="62" fill="${C.bg}" text-anchor="middle">PLAYER</text>
    <text x="256" y="404" font-family='${SA}' font-weight="700" font-size="22" letter-spacing="2" fill="${C.bg}" text-anchor="middle">PROSPERA HOOPS · DMV</text>
  </svg>`;
  await png(badge, 512, 512, "founding-player-badge.png");

  // 4) Launch announce (1080x1350)
  const aw = 1080, ah = 1350;
  const announce = `<svg xmlns="http://www.w3.org/2000/svg" width="${aw}" height="${ah}" viewBox="0 0 ${aw} ${ah}"><defs>${FONT}
    <radialGradient id="glow" cx="0.5" cy="0.34" r="0.7"><stop offset="0" stop-color="#FF6A1A" stop-opacity="0.14"/><stop offset="1" stop-color="#FF6A1A" stop-opacity="0"/></radialGradient></defs>
    <rect width="${aw}" height="${ah}" fill="${C.bg}"/><rect width="${aw}" height="${ah}" fill="url(#glow)"/>
    ${emblemAt(aw/2-90, 150, 180)}
    ${lockupText(aw/2, 420, 60)}
    <text x="${aw/2}" y="700" font-family='${SA}' font-weight="800" font-size="116" fill="${C.text}" text-anchor="middle">ARRIVES</text>
    <text x="${aw/2}" y="820" font-family='${SA}' font-weight="800" font-size="116" fill="${C.orange}" text-anchor="middle">WEDNESDAY</text>
    <text x="${aw/2}" y="960" font-family='${SA}' font-weight="700" font-size="40" fill="${C.mut}" text-anchor="middle">The DMV's basketball scouting system of record.</text>
    <text x="${aw/2}" y="1015" font-family='${SA}' font-weight="700" font-size="36" fill="${C.mut}" text-anchor="middle">DC · MD · VA — high school &amp; AAU. Free.</text>
    <text x="${aw/2}" y="1285" font-family='${SA}' font-weight="700" font-size="38" letter-spacing="4" fill="${C.text}" text-anchor="middle">PROSPERAHOOPS.COM</text>
  </svg>`;
  await png(announce, aw, ah, "launch-announce.png");

  console.log("launch assets → docs/launch-assets/: qr-prosperahoops.png, qr-flyer.png, founding-player-badge.png, launch-announce.png");
}
run();
