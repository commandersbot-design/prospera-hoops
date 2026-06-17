// Launch-eve social graphics (1080×1080), on-brand (graphite + orange, Saira).
// 1) Will Braun-Duin — RED HOT (56 & 40 doubleheader)
// 2) Major Jones — THE LEAP (year-over-year jump)
// 3) DMV Summer Scoring Leaders (top 5)
// Output → public/brand/social/. Run: node scripts/gen-launch-eve.mjs
import sharp from "sharp";
import fs from "fs";
import path from "path";

const brand = path.join(process.cwd(), "public", "brand");
const outDir = path.join(brand, "social");
fs.mkdirSync(outDir, { recursive: true });

const FONT_STYLE = (fs.readFileSync(path.join(brand, "svg", "prosperahoops-wordmark-dark.svg"), "utf8").match(/<style>[\s\S]*?<\/style>/) || [""])[0];
const SA = '"Saira Condensed", sans-serif';
const T = { bg0: "#0B0E13", bg1: "#10141b", text: "#f6f6f4", mut: "#9a9ca2", orange: "#FF6A1A", sage: "#6fae9b", blue: "#3B9EFF", teal: "#2FBF8F" };

const RAMP_CLUSTER = (x, y, s, op) => `<g transform="translate(${x},${y}) scale(${s})" opacity="${op}">
  <rect x="0" y="60" width="26" height="60" rx="4" fill="#9A3E12"/><rect x="34" y="36" width="26" height="84" rx="4" fill="#C24A14"/>
  <rect x="68" y="12" width="26" height="108" rx="4" fill="#E0531B"/><rect x="102" y="34" width="26" height="86" rx="4" fill="#FF6A1A"/>
  <circle cx="115" cy="-2" r="26" fill="#FF6A1A"/><line x1="-6" y1="121" x2="140" y2="121" stroke="rgba(255,255,255,0.16)" stroke-width="3"/></g>`;
const baseDefs = `<defs>${FONT_STYLE}<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="${T.bg0}"/><stop offset="0.55" stop-color="${T.bg1}"/><stop offset="1" stop-color="${T.bg0}"/></linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.38" r="0.6"><stop offset="0" stop-color="#FF6A1A" stop-opacity="0.12"/><stop offset="1" stop-color="#FF6A1A" stop-opacity="0"/></radialGradient></defs>`;
const lockupTop = (cx) => `<text x="${cx}" y="118" font-family='${SA}' font-weight="800" font-size="40" letter-spacing="2" text-anchor="middle"><tspan fill="${T.text}">PROSPERA </tspan><tspan fill="${T.orange}">HOOPS</tspan></text>`;
const handle = `<text x="540" y="1012" font-family='${SA}' font-weight="700" font-size="30" letter-spacing="6" fill="${T.mut}" text-anchor="middle">@PROSPERAHOOPS · 6.18</text>
  <line x1="80" y1="1040" x2="1000" y2="1040" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>`;
const pill = (cx, y, w, label, fill, txt) => `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="56" rx="28" fill="${fill}"/>
  <text x="${cx}" y="${y + 38}" font-family='${SA}' font-weight="800" font-size="28" letter-spacing="7" fill="${txt}" text-anchor="middle">${label}</text>`;

async function render(name, inner) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
    ${baseDefs}<rect width="1080" height="1080" fill="url(#g)"/><rect width="1080" height="1080" fill="url(#glow)"/>${inner}</svg>`;
  fs.writeFileSync(path.join(outDir, `${name}.svg`), svg);
  await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, `${name}.png`));
  console.log(`✓ ${name}.png`);
}

// 1) RED HOT — Will Braun-Duin
async function redHot() {
  await render("post-will-redhot-1080", `
    ${RAMP_CLUSTER(40, 800, 2.0, 0.4)} ${RAMP_CLUSTER(860, 770, 2.2, 0.36)} ${lockupTop(540)}
    ${pill(540, 200, 300, "RED HOT", T.orange, "#2a1206")}
    <text x="320" y="500" font-family='${SA}' font-weight="800" font-size="280" fill="${T.text}" text-anchor="middle">56</text>
    <text x="760" y="500" font-family='${SA}' font-weight="800" font-size="280" fill="${T.text}" text-anchor="middle">40</text>
    <text x="320" y="560" font-family='${SA}' font-weight="700" font-size="28" letter-spacing="2" fill="${T.sage}" text-anchor="middle">vs Purple Storm · W</text>
    <text x="760" y="560" font-family='${SA}' font-weight="700" font-size="28" letter-spacing="2" fill="${T.mut}" text-anchor="middle">vs Heritage</text>
    <text x="540" y="700" font-family='${SA}' font-weight="800" font-size="64" letter-spacing="6" fill="${T.orange}" text-anchor="middle">96 POINTS. ONE DAY.</text>
    <text x="540" y="830" font-family='${SA}' font-weight="800" font-size="78" letter-spacing="1" fill="${T.text}" text-anchor="middle">WILL BRAUN-DUIN</text>
    <text x="540" y="884" font-family='${SA}' font-weight="700" font-size="33" letter-spacing="3" fill="${T.sage}" text-anchor="middle">JOHN HANDLEY · 28.6 PPG · 2ND IN THE DMV</text>
    ${handle}`);
}

// 2) THE LEAP — Major Jones
async function theLeap() {
  const row = (y, label, prior, now, delta) => `
    <text x="150" y="${y}" font-family='${SA}' font-weight="700" font-size="40" letter-spacing="4" fill="${T.mut}">${label}</text>
    <text x="430" y="${y}" font-family='${SA}' font-weight="700" font-size="72" fill="${T.mut}" text-anchor="middle">${prior}</text>
    <text x="560" y="${y}" font-family='${SA}' font-weight="700" font-size="44" fill="${T.mut}" text-anchor="middle">→</text>
    <text x="700" y="${y}" font-family='${SA}' font-weight="800" font-size="92" fill="${T.text}" text-anchor="middle">${now}</text>
    <text x="905" y="${y}" font-family='${SA}' font-weight="800" font-size="52" fill="${T.teal}" text-anchor="middle">+${delta}</text>`;
  await render("post-major-leap-1080", `
    ${RAMP_CLUSTER(40, 820, 2.0, 0.36)} ${RAMP_CLUSTER(860, 800, 2.2, 0.32)} ${lockupTop(540)}
    ${pill(540, 200, 280, "THE LEAP", T.blue, "#06233f")}
    <text x="540" y="330" font-family='${SA}' font-weight="800" font-size="92" letter-spacing="1" fill="${T.text}" text-anchor="middle">MAJOR JONES</text>
    <text x="540" y="380" font-family='${SA}' font-weight="700" font-size="32" letter-spacing="4" fill="${T.sage}" text-anchor="middle">DEMATHA · YEAR-OVER-YEAR JUMP</text>
    <line x1="150" y1="430" x2="930" y2="430" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
    <text x="430" y="478" font-family='${SA}' font-weight="700" font-size="24" letter-spacing="4" fill="${T.mut}" text-anchor="middle">'25</text>
    <text x="700" y="478" font-family='${SA}' font-weight="700" font-size="24" letter-spacing="4" fill="${T.orange}" text-anchor="middle">'26</text>
    ${row(580, "PTS", "8.4", "11.8", "3.4")}
    ${row(700, "REB", "1.6", "3.0", "1.4")}
    ${row(820, "AST", "1.0", "3.5", "2.5")}
    <text x="540" y="918" font-family='${SA}' font-weight="700" font-size="30" letter-spacing="3" fill="${T.sage}" text-anchor="middle">DEVELOPMENT, TRACKED OVER TIME.</text>
    ${handle}`);
}

// 3) DMV Summer Scoring Leaders
async function leaders() {
  const rows = [
    ["1", "DREW HILL", "28.8", "St. John's"],
    ["2", "WILL BRAUN-DUIN", "28.6", "John Handley"],
    ["3", "JEREMIAH WILLIAMS", "28.3", "Walter Johnson"],
    ["4", "GABE COLSTON", "28.0", "JFK"],
    ["5", "JORDAN FOX", "27.9", "DOZA"],
  ];
  const row = (y, [rk, nm, ppg, team]) => `
    <text x="135" y="${y}" font-family='${SA}' font-weight="800" font-size="54" fill="${rk === "1" ? T.orange : T.mut}">${rk}</text>
    <text x="210" y="${y}" font-family='${SA}' font-weight="800" font-size="46" fill="${T.text}">${nm}</text>
    <text x="210" y="${y + 34}" font-family='${SA}' font-weight="700" font-size="25" letter-spacing="2" fill="${T.sage}">${team}</text>
    <text x="948" y="${y}" font-family='${SA}' font-weight="800" font-size="58" fill="${T.orange}" text-anchor="end">${ppg}</text>`;
  await render("post-leaders-1080", `
    ${RAMP_CLUSTER(40, 840, 2.0, 0.34)} ${RAMP_CLUSTER(860, 820, 2.2, 0.3)} ${lockupTop(540)}
    <rect x="270" y="196" width="540" height="56" rx="28" fill="${T.orange}"/>
    <text x="540" y="234" font-family='${SA}' font-weight="800" font-size="26" letter-spacing="5" fill="#2a1206" text-anchor="middle">SUMMER SCORING LEADERS</text>
    ${rows.map((r, i) => row(360 + i * 130, r)).join("")}
    <text x="540" y="962" font-family='${SA}' font-weight="700" font-size="27" letter-spacing="2" fill="${T.mut}" text-anchor="middle">REAL BOX SCORES · NO FAKE RANKINGS · MIN. 5 GP</text>
    ${handle}`);
}

await redHot();
await theLeap();
await leaders();
console.log("\nDone → public/brand/social/ (post-will-redhot, post-major-leap, post-leaders)");
