// npm run cards -- --team <name>
// Daily output engine: renders branded 1080×1350 PNGs from the live data —
// a PLAYER CARD per rostered player (stats + archetype) and a GAME RECAP card
// per game (final score, top performers) with an auto caption you can paste.
//
// No server: reads public/data/*.json, reuses the locked archetype classifier
// (src/lib/archetype.js) and the brand kit's embedded Saira font, writes PNGs
// via sharp to cards/<team-slug>/. Prints recap captions at the end.
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { buildArchetypeCohort, archetypeForPlayer } from "../src/lib/archetype.js";

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : d; };
const TEAM = arg("--team", "hayfield");

const nameKey = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const r1 = (n) => (isFinite(n) ? Math.round(n * 10) / 10 : 0);
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const cleanOpp = (s) => String(s || "").replace(/\s*\([^)]*\)/g, "").trim();

const ch = JSON.parse(fs.readFileSync("public/data/capitolHoops.json", "utf8"));
const logs = JSON.parse(fs.readFileSync("public/data/gameLogs.json", "utf8")).players || {};
const team = Object.values(ch.teams).find((t) => new RegExp(TEAM, "i").test(t.name) || new RegExp(TEAM, "i").test(t.slug || ""));
if (!team) { console.error(`No team matching "${TEAM}"`); process.exit(1); }
const cohort = buildArchetypeCohort(logs, ch.teams);

const outDir = path.join("cards", team.slug || nameKey(team.name));
fs.mkdirSync(path.join(outDir, "players"), { recursive: true });
fs.mkdirSync(path.join(outDir, "recaps"), { recursive: true });

// --- brand bits (reused from the kit) --------------------------------------
const FONT_STYLE = (fs.readFileSync("public/brand/svg/prosperahoops-wordmark-dark.svg", "utf8").match(/<style>[\s\S]*?<\/style>/) || [""])[0];
const SA = '"Saira Condensed", sans-serif';
const C = { bg0: "#0B0E13", bg1: "#10141b", text: "#f6f6f4", mut: "#9a9ca2", orange: "#FF6A1A", sage: "#6fae9b", green: "#36d399", red: "#f06a6a" };
const W = 1080, H = 1350;
const cluster = (x, y, s, op) => `<g transform="translate(${x},${y}) scale(${s})" opacity="${op}">
  <rect x="0" y="60" width="26" height="60" rx="4" fill="#9A3E12"/><rect x="34" y="36" width="26" height="84" rx="4" fill="#C24A14"/>
  <rect x="68" y="12" width="26" height="108" rx="4" fill="#E0531B"/><rect x="102" y="34" width="26" height="86" rx="4" fill="#FF6A1A"/>
  <circle cx="115" cy="-2" r="26" fill="#FF6A1A"/><line x1="-6" y1="121" x2="140" y2="121" stroke="rgba(255,255,255,0.16)" stroke-width="3"/></g>`;
const defs = `<defs>${FONT_STYLE}
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.bg0}"/><stop offset="0.55" stop-color="${C.bg1}"/><stop offset="1" stop-color="${C.bg0}"/></linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.32" r="0.7"><stop offset="0" stop-color="#FF6A1A" stop-opacity="0.12"/><stop offset="1" stop-color="#FF6A1A" stop-opacity="0"/></radialGradient></defs>`;
const lockup = (cx, y) => `<text x="${cx}" y="${y}" font-family='${SA}' font-weight="800" font-size="38" letter-spacing="2" text-anchor="middle"><tspan fill="${C.text}">PROSPERA </tspan><tspan fill="${C.orange}">HOOPS</tspan></text>`;
const handle = `<text x="${W / 2}" y="1300" font-family='${SA}' font-weight="700" font-size="26" letter-spacing="6" fill="${C.mut}" text-anchor="middle">@PROSPERAHOOPS</text>
  <line x1="90" y1="1255" x2="${W - 90}" y2="1255" stroke="rgba(255,255,255,0.07)" stroke-width="2"/>`;
const frame = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}
  <rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${cluster(40, 1080, 2.2, 0.45)}${cluster(840, 1060, 2.4, 0.4)}${lockup(W / 2, 110)}${inner}${handle}</svg>`;

async function render(file, inner) { await sharp(Buffer.from(frame(inner))).png().toFile(file); }

// --- stat line for a player's games ----------------------------------------
function statLine(games) {
  const s = games.reduce((a, g) => { for (const k of ["pts", "reb", "ast", "fgm", "fga", "tpm", "tpa", "ftm", "fta"]) a[k] += g[k] || 0; return a; }, { pts: 0, reb: 0, ast: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0 });
  const gp = games.length, pct = (m, a) => (a > 0 ? `${r1((m / a) * 100)}%` : "—");
  const tsDen = 2 * (s.fga + 0.44 * s.fta);
  return { gp, ppg: r1(s.pts / gp), rpg: r1(s.reb / gp), apg: r1(s.ast / gp), fgPct: pct(s.fgm, s.fga), tpPct: pct(s.tpm, s.tpa), ftPct: pct(s.ftm, s.fta), tsPct: tsDen > 0 ? `${r1((s.pts / tsDen) * 100)}%` : "—" };
}

// --- player cards ----------------------------------------------------------
const bigStat = (x, val, label) => `<text x="${x}" y="800" font-family='${SA}' font-weight="800" font-size="120" fill="${C.orange}" text-anchor="middle">${val}</text>
  <text x="${x}" y="858" font-family='${SA}' font-weight="700" font-size="30" letter-spacing="6" fill="${C.mut}" text-anchor="middle">${label}</text>`;
const splitStat = (x, val, label) => `<text x="${x}" y="1000" font-family='${SA}' font-weight="800" font-size="56" fill="${C.text}" text-anchor="middle">${val}</text>
  <text x="${x}" y="1044" font-family='${SA}' font-weight="700" font-size="24" letter-spacing="4" fill="${C.mut}" text-anchor="middle">${label}</text>`;

let nPlayers = 0;
for (const pl of team.players) {
  const e = logs[nameKey(pl.name)]; const games = (e && e.games) || [];
  if (!games.length) continue;
  const st = statLine(games);
  const a = archetypeForPlayer(pl.name, cohort, pl.position);
  const nm = pl.name.toUpperCase();
  const nameSize = nm.length > 17 ? 66 : nm.length > 13 ? 82 : 100;
  const meta = [team.name, pl.position, pl.classYear ? `'${String(pl.classYear).slice(2)}` : null].filter(Boolean).join("  ·  ");
  const arch = a && a.label ? `<rect x="${W / 2 - 230}" y="500" width="460" height="56" rx="28" fill="none" stroke="${C.orange}" stroke-width="2"/>
    <text x="${W / 2}" y="538" font-family='${SA}' font-weight="800" font-size="26" letter-spacing="3" fill="${C.orange}" text-anchor="middle">${esc(a.label.toUpperCase())}${a.earlyRead ? "  · EARLY READ" : ""}</text>` : "";
  const inner = `
    <text x="${W / 2}" y="280" font-family='${SA}' font-weight="700" font-size="28" letter-spacing="10" fill="${C.orange}" text-anchor="middle">PLAYER CARD</text>
    <text x="${W / 2}" y="400" font-family='${SA}' font-weight="800" font-size="${nameSize}" letter-spacing="1" fill="${C.text}" text-anchor="middle">${esc(nm)}</text>
    <text x="${W / 2}" y="455" font-family='${SA}' font-weight="700" font-size="30" letter-spacing="2" fill="${C.sage}" text-anchor="middle">${esc(meta)}</text>
    ${arch}
    ${bigStat(270, st.ppg, "PPG")}${bigStat(540, st.rpg, "RPG")}${bigStat(810, st.apg, "APG")}
    ${splitStat(216, st.fgPct, "FG%")}${splitStat(432, st.tpPct, "3P%")}${splitStat(648, st.ftPct, "FT%")}${splitStat(864, st.tsPct, "TS%")}
    <text x="${W / 2}" y="1130" font-family='${SA}' font-weight="700" font-size="24" letter-spacing="4" fill="${C.mut}" text-anchor="middle">${st.gp} GAMES · CAPITOL HOOPS 2026</text>`;
  await render(path.join(outDir, "players", `${nameKey(pl.name)}.png`), inner);
  nPlayers++;
}

// --- game recaps -----------------------------------------------------------
// Group the team's player-games by date+opponent.
const byGame = new Map();
for (const pl of team.players) {
  const e = logs[nameKey(pl.name)]; for (const g of ((e && e.games) || [])) {
    const k = `${g.date}|${g.opp}`;
    if (!byGame.has(k)) byGame.set(k, { date: g.date, opp: g.opp, result: g.result, lines: [] });
    byGame.get(k).lines.push({ player: pl.name, pts: g.pts || 0, reb: g.reb || 0, ast: g.ast || 0 });
  }
}
const captions = [];
let nRecaps = 0;
for (const g of byGame.values()) {
  const m = /(win|loss)\s+(\d+)\s*-\s*(\d+)/i.exec(g.result || "");
  const won = m && m[1].toLowerCase() === "win";
  const tScore = m ? m[2] : "", oScore = m ? m[3] : "";
  const opp = cleanOpp(g.opp);
  const top = g.lines.sort((a, b) => b.pts - a.pts).slice(0, 3);
  const lead = top[0] || { player: "", pts: 0, reb: 0 };
  const wl = won ? "W" : "L";
  const scoreColor = won ? C.green : C.red;
  const oppSize = opp.length > 22 ? 40 : 52;
  const rows = top.map((t, i) => `<text x="160" y="${900 + i * 70}" font-family='${SA}' font-weight="700" font-size="40" fill="${C.text}">${esc(t.player)}</text>
    <text x="${W - 160}" y="${900 + i * 70}" font-family='${SA}' font-weight="800" font-size="40" fill="${C.orange}" text-anchor="end">${t.pts} PTS · ${t.reb} REB · ${t.ast} AST</text>`).join("");
  const inner = `
    <text x="${W / 2}" y="280" font-family='${SA}' font-weight="700" font-size="28" letter-spacing="10" fill="${C.orange}" text-anchor="middle">GAME RECAP</text>
    <text x="${W / 2}" y="340" font-family='${SA}' font-weight="700" font-size="24" letter-spacing="4" fill="${C.mut}" text-anchor="middle">CAPITOL HOOPS · ${esc((g.date || "").toUpperCase())}</text>
    <text x="${W / 2}" y="470" font-family='${SA}' font-weight="800" font-size="64" fill="${C.text}" text-anchor="middle">${esc(team.name.toUpperCase())}</text>
    <text x="${W / 2}" y="560" font-family='${SA}' font-weight="800" font-size="92" fill="${scoreColor}" text-anchor="middle">${wl}  ${tScore}–${oScore}</text>
    <text x="${W / 2}" y="630" font-family='${SA}' font-weight="700" font-size="${oppSize}" letter-spacing="1" fill="${C.sage}" text-anchor="middle">${won ? "def." : "vs"} ${esc(opp.toUpperCase())}</text>
    <text x="${W / 2}" y="820" font-family='${SA}' font-weight="700" font-size="26" letter-spacing="8" fill="${C.mut}" text-anchor="middle">TOP PERFORMERS</text>
    ${rows}`;
  await render(path.join(outDir, "recaps", `${nameKey(g.date + "-" + opp)}.png`), inner);
  nRecaps++;
  const verb = lead.pts >= 20 ? "poured in" : "posted";
  const boards = lead.reb >= 8 ? ` and ${lead.reb} boards` : "";
  captions.push(`${lead.player} ${verb} ${lead.pts}${boards} to lead ${team.name} ${won ? "past" : "in a tough loss to"} ${opp}, ${tScore}-${oScore}. 🏀 #DMVHoops @prosperahoops`);
}

// caption file + console
fs.writeFileSync(path.join(outDir, "recap-captions.txt"), captions.join("\n\n") + "\n");
console.log(`\nPROSPERA HOOPS · cards  →  ${outDir}/`);
console.log(`  player cards: ${nPlayers}  (players/)`);
console.log(`  recap cards:  ${nRecaps}  (recaps/) + recap-captions.txt\n`);
console.log("Recap captions:");
for (const c of captions) console.log("  • " + c);
