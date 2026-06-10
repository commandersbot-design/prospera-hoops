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

// --- Profile pics (square) — from the clean SYMBOL, not the avatar ----------
// The kit's avatar-circle has a garbled wordmark; and text is illegible at
// profile-pic sizes anyway. The symbol (ball + bars) is the right mark.
// Rendered from the SVG source for crispness at small sizes.
async function profilePics() {
  const src = path.join(brand, "svg", "prosperahoops-symbol.svg");
  const sizes = [["twitter-profile-400", 400], ["instagram-profile-320", 320], ["tiktok-profile-200", 200]];
  for (const [name, px] of sizes) {
    await sharp(src, { density: 384 }).resize(px, px).png().toFile(path.join(outDir, `${name}.png`));
    console.log(`✓ ${name}.png`);
  }
}

// --- Square IG post templates (1080×1080) -----------------------------------
// Editable SVG (swap the placeholder text in any vector tool) + a ready PNG.
// The Saira Condensed font is reused (embedded base64) from the kit wordmark so
// text renders on-brand without fetching webfonts.
const FONT_STYLE = (fs.readFileSync(path.join(brand, "svg", "prosperahoops-wordmark-dark.svg"), "utf8")
  .match(/<style>[\s\S]*?<\/style>/) || [""])[0];
const SA = '"Saira Condensed", sans-serif';

const T = { bg0: "#0B0E13", bg1: "#10141b", text: "#f6f6f4", mut: "#9a9ca2", orange: "#FF6A1A", sage: "#6fae9b" };
const RAMP_CLUSTER = (x, y, s, op) => `<g transform="translate(${x},${y}) scale(${s})" opacity="${op}">
  <rect x="0" y="60" width="26" height="60" rx="4" fill="#9A3E12"/><rect x="34" y="36" width="26" height="84" rx="4" fill="#C24A14"/>
  <rect x="68" y="12" width="26" height="108" rx="4" fill="#E0531B"/><rect x="102" y="34" width="26" height="86" rx="4" fill="#FF6A1A"/>
  <circle cx="115" cy="-2" r="26" fill="#FF6A1A"/><line x1="-6" y1="121" x2="140" y2="121" stroke="rgba(255,255,255,0.16)" stroke-width="3"/></g>`;
const baseDefs = `<defs>${FONT_STYLE}<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="${T.bg0}"/><stop offset="0.55" stop-color="${T.bg1}"/><stop offset="1" stop-color="${T.bg0}"/></linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.38" r="0.6"><stop offset="0" stop-color="#FF6A1A" stop-opacity="0.10"/><stop offset="1" stop-color="#FF6A1A" stop-opacity="0"/></radialGradient></defs>`;

async function renderTemplate(name, inner) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
    ${baseDefs}<rect width="1080" height="1080" fill="url(#g)"/><rect width="1080" height="1080" fill="url(#glow)"/>
    ${inner}</svg>`;
  fs.writeFileSync(path.join(outDir, `${name}.svg`), svg);
  await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, `${name}.png`));
  console.log(`✓ ${name}.svg + .png`);
}

const handle = `<text x="540" y="1012" font-family='${SA}' font-weight="700" font-size="30" letter-spacing="6" fill="${T.mut}" text-anchor="middle">@PROSPERAHOOPS</text>
  <line x1="80" y1="1040" x2="1000" y2="1040" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>`;
const lockupTop = (cx) => `<text x="${cx}" y="120" font-family='${SA}' font-weight="800" font-size="40" letter-spacing="2" text-anchor="middle"><tspan fill="${T.text}">PROSPERA </tspan><tspan fill="${T.orange}">HOOPS</tspan></text>`;

async function igTemplates() {
  // 1) Player spotlight
  await renderTemplate("ig-template-spotlight-1080", `
    ${RAMP_CLUSTER(40, 770, 2.0, 0.5)} ${RAMP_CLUSTER(820, 740, 2.4, 0.42)} ${lockupTop(540)}
    <text x="540" y="270" font-family='${SA}' font-weight="700" font-size="26" letter-spacing="8" fill="${T.orange}" text-anchor="middle">PLAYER SPOTLIGHT</text>
    <text x="540" y="430" font-family='${SA}' font-weight="800" font-size="120" letter-spacing="1" fill="${T.text}" text-anchor="middle">PLAYER NAME</text>
    <text x="540" y="492" font-family='${SA}' font-weight="700" font-size="36" letter-spacing="3" fill="${T.sage}" text-anchor="middle">SCHOOL · CLASS OF '00 · POS</text>
    ${[["PPG", 270], ["RPG", 540], ["APG", 810]].map(([l, x]) => `
      <text x="${x}" y="700" font-family='${SA}' font-weight="800" font-size="96" fill="${T.orange}" text-anchor="middle">0.0</text>
      <text x="${x}" y="752" font-family='${SA}' font-weight="700" font-size="30" letter-spacing="6" fill="${T.mut}" text-anchor="middle">${l}</text>`).join("")}
    ${handle}`);

  // 2) Stat drop
  await renderTemplate("ig-template-stat-1080", `
    ${RAMP_CLUSTER(60, 780, 2.2, 0.45)} ${RAMP_CLUSTER(840, 760, 2.2, 0.4)} ${lockupTop(540)}
    <rect x="340" y="220" width="400" height="50" rx="25" fill="${T.orange}"/>
    <text x="540" y="255" font-family='${SA}' font-weight="800" font-size="26" letter-spacing="6" fill="#2a2410" text-anchor="middle">SUMMER LEAGUE · LEADER</text>
    <text x="540" y="600" font-family='${SA}' font-weight="800" font-size="300" fill="${T.text}" text-anchor="middle">0.0</text>
    <text x="540" y="680" font-family='${SA}' font-weight="700" font-size="48" letter-spacing="10" fill="${T.orange}" text-anchor="middle">PPG</text>
    <text x="540" y="800" font-family='${SA}' font-weight="800" font-size="64" fill="${T.text}" text-anchor="middle">PLAYER NAME</text>
    <text x="540" y="852" font-family='${SA}' font-weight="700" font-size="32" letter-spacing="3" fill="${T.sage}" text-anchor="middle">TEAM · GP</text>
    ${handle}`);

  // 3) Blank branded canvas (overlay your own photo/text)
  await renderTemplate("ig-template-blank-1080", `
    ${RAMP_CLUSTER(0, 880, 2.6, 0.5)} ${RAMP_CLUSTER(880, 860, 2.6, 0.5)} ${lockupTop(540)}
    <rect x="120" y="200" width="840" height="620" rx="18" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="2" stroke-dasharray="10 10"/>
    <text x="540" y="520" font-family='${SA}' font-weight="700" font-size="30" letter-spacing="6" fill="${T.mut}" text-anchor="middle">YOUR PHOTO / HEADLINE HERE</text>
    ${handle}`);
}

// --- Clean circular avatar (rebuild — the kit's avatar wordmark was garbled) -
// Symbol (ball + bars) up top + correctly-spaced PROSPERA HOOPS below, in the
// embedded Saira font. Overwrites the broken kit avatar (png 512/192 + svg).
async function cleanAvatar() {
  const cluster = `<g transform="translate(150,96) scale(1.55)">
    <rect x="0" y="60" width="26" height="60" rx="4" fill="#9A3E12"/><rect x="34" y="36" width="26" height="84" rx="4" fill="#C24A14"/>
    <rect x="68" y="12" width="26" height="108" rx="4" fill="#E0531B"/><rect x="102" y="34" width="26" height="86" rx="4" fill="#FF6A1A"/>
    <circle cx="115" cy="-2" r="26" fill="#FF6A1A"/><line x1="-6" y1="121" x2="140" y2="121" stroke="rgba(255,255,255,0.20)" stroke-width="3"/></g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>${FONT_STYLE}</defs>
    <circle cx="256" cy="256" r="247" fill="#0B0E13" stroke="#FF6A1A" stroke-width="10"/>
    ${cluster}
    <text x="256" y="408" font-family='${SA}' font-weight="800" font-size="78" letter-spacing="2" fill="#f6f6f4" text-anchor="middle">PROSPERA</text>
    <text x="256" y="452" font-family='${SA}' font-weight="800" font-size="40" letter-spacing="14" fill="#FF6A1A" text-anchor="middle">HOOPS</text>
  </svg>`;
  fs.writeFileSync(path.join(brand, "svg", "prosperahoops-avatar-circle.svg"), svg);
  await sharp(Buffer.from(svg)).resize(512, 512).png().toFile(path.join(brand, "png", "prosperahoops-avatar-circle-512.png"));
  await sharp(Buffer.from(svg)).resize(192, 192).png().toFile(path.join(brand, "png", "prosperahoops-avatar-circle-192.png"));
  // also offer it as a social-ready avatar
  await sharp(Buffer.from(svg)).resize(512, 512).png().toFile(path.join(outDir, "avatar-with-text-512.png"));
  console.log("✓ clean avatar (512/192 + svg) — fixed PROSPERA HOOPS text");
}

// --- Launch carousel (3× 1080×1080) — "what is Prospera Hoops" --------------
async function carousel() {
  // Slide 1 — hook
  await renderTemplate("ig-carousel-1-hook-1080", `
    ${RAMP_CLUSTER(40, 800, 2.0, 0.45)} ${RAMP_CLUSTER(840, 770, 2.4, 0.4)}
    <text x="540" y="430" font-family='${SA}' font-weight="800" font-size="150" letter-spacing="1" fill="${T.text}" text-anchor="middle">PROSPERA</text>
    <text x="540" y="570" font-family='${SA}' font-weight="800" font-size="150" letter-spacing="1" fill="${T.orange}" text-anchor="middle">HOOPS</text>
    <text x="540" y="652" font-family='${SA}' font-weight="700" font-size="36" letter-spacing="3" fill="${T.sage}" text-anchor="middle">DMV HIGH SCHOOL HOOPS · SCOUTED</text>
    ${handle}`);
  // Slide 2 — what you get
  await renderTemplate("ig-carousel-2-what-1080", `
    ${RAMP_CLUSTER(840, 800, 2.2, 0.35)}
    <text x="540" y="130" font-family='${SA}' font-weight="700" font-size="26" letter-spacing="8" fill="${T.info}" text-anchor="middle">WHAT YOU GET</text>
    ${[["EVERY DMV HOOPER", "The whole DMV — not just the 5-stars.", 300],
       ["TRACKED IN REAL TIME", "Stats, film &amp; development, all season.", 520],
       ["YOUR RECRUITING HUB", "One link with everything coaches need.", 740]]
      .map(([h, s, y]) => `
      <rect x="120" y="${y - 46}" width="10" height="66" rx="5" fill="${T.orange}"/>
      <text x="162" y="${y}" font-family='${SA}' font-weight="800" font-size="62" fill="${T.text}">${h}</text>
      <text x="162" y="${y + 44}" font-family='${SA}' font-weight="600" font-size="30" fill="${T.mut}">${s}</text>`).join("")}
    ${handle}`);
  // Slide 3 — CTA
  await renderTemplate("ig-carousel-3-cta-1080", `
    ${RAMP_CLUSTER(40, 820, 2.4, 0.5)} ${RAMP_CLUSTER(840, 800, 2.4, 0.5)}
    <text x="540" y="360" font-family='${SA}' font-weight="800" font-size="130" fill="${T.text}" text-anchor="middle">SCOUT</text>
    <text x="540" y="490" font-family='${SA}' font-weight="800" font-size="130" fill="${T.orange}" text-anchor="middle">ANYBODY</text>
    <text x="540" y="575" font-family='${SA}' font-weight="700" font-size="36" letter-spacing="3" fill="${T.sage}" text-anchor="middle">FREE · YOUR RECRUITING HOME BASE</text>
    <text x="540" y="828" font-family='${SA}' font-weight="700" font-size="44" letter-spacing="1" fill="${T.text}" text-anchor="middle">prospera-preps.vercel.app</text>
    ${handle}`);
  console.log("✓ launch carousel (3 slides)");
}

await cleanAvatar();
await xHeader();
await profilePics();
await igTemplates();
await carousel();
console.log("\nDone → public/brand/social/");
