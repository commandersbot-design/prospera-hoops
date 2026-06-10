// Generate social-media images from the Prospera Hoops brand kit.
//   • X / Twitter header (1500×500) — graphite + bar-ramp motif + centered lockup
//   • Platform-exact profile pics (square, circle avatar) for Twitter/IG/TikTok
// Output → public/brand/social/. Run: node scripts/gen-social.mjs
import sharp from "sharp";
import fs from "fs";
import path from "path";

const brand = path.join(process.cwd(), "public", "brand");
const outDir = path.join(brand, "social");
fs.mkdirSync(outDir, { recursive: true });

const RAMP = ["#9A3E12", "#C24A14", "#E0531B", "#FF6A1A"];

// --- X / Twitter header (1500×500) ------------------------------------------
async function xHeader() {
  const W = 1500, H = 500;
  // One ascending bar-ramp + ball cluster (echoes the symbol), drawn faint and
  // oversized bleeding off an edge. Reused on both sides.
  const cluster = (x, y, s, op) => `
    <g transform="translate(${x},${y}) scale(${s})" opacity="${op}">
      <rect x="0"   y="60" width="26" height="60" rx="4" fill="${RAMP[0]}"/>
      <rect x="34"  y="36" width="26" height="84" rx="4" fill="${RAMP[1]}"/>
      <rect x="68"  y="12" width="26" height="108" rx="4" fill="${RAMP[2]}"/>
      <rect x="102" y="34" width="26" height="86" rx="4" fill="${RAMP[3]}"/>
      <circle cx="115" cy="-2" r="26" fill="${RAMP[3]}"/>
      <line x1="-6" y1="121" x2="140" y2="121" stroke="rgba(255,255,255,0.18)" stroke-width="3"/>
    </g>`;
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0B0E13"/><stop offset="0.55" stop-color="#10141b"/><stop offset="1" stop-color="#0B0E13"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#FF6A1A" stop-opacity="0.10"/><stop offset="1" stop-color="#FF6A1A" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>
    ${cluster(70, 250, 2.1, 0.5)}
    ${cluster(1230, 210, 2.6, 0.42)}
    <line x1="0" y1="${H - 54}" x2="${W}" y2="${H - 54}" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>
  </svg>`);

  const lockup = path.join(brand, "png", "prosperahoops-lockup-dark-1600w.png");
  const lw = 720;
  const resized = await sharp(lockup).resize({ width: lw }).toBuffer();
  const meta = await sharp(resized).metadata();
  await sharp(bg)
    .composite([{ input: resized, left: Math.round((W - lw) / 2), top: Math.round((H - meta.height) / 2) }])
    .png().toFile(path.join(outDir, "x-header-1500x500.png"));
  console.log("✓ x-header-1500x500.png");
}

// --- Profile pics (square, from the circle avatar) --------------------------
async function profilePics() {
  const src = path.join(brand, "png", "prosperahoops-avatar-circle-512.png");
  const sizes = [["twitter-profile-400", 400], ["instagram-profile-320", 320], ["tiktok-profile-200", 200]];
  for (const [name, px] of sizes) {
    await sharp(src).resize(px, px, { fit: "contain", background: { r: 11, g: 14, b: 19, alpha: 1 } })
      .png().toFile(path.join(outDir, `${name}.png`));
    console.log(`✓ ${name}.png`);
  }
}

await xHeader();
await profilePics();
console.log("\nDone → public/brand/social/");
