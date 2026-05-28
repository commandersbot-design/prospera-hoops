// Ingest ranked DMV recruits (scripts/ranked-prospects.json) into the prospect
// database with per-service recruiting rankings (247 / ESPN / Rivals) + stars.
//
// Source: a manual capture of 247Sports state boards + the ESPN/SC-Next national
// top-100 (see ranked-prospects.json README). 247 stars are derived from 247's
// numeric rating via 247's published bands — never guessed. ESPN entries carry
// ESPN's national rank + grade. Rivals isn't in the source, so it stays null
// (the UI renders "Not listed" rather than inventing a rank).
//
// Idempotent + clean: every prospect previously added by this importer
// (source "industry-rankings") is removed first, then re-added from the file,
// so re-running fully replaces the ranked set (e.g. swapping a graduated class).
// Also removes the seeded demo placeholders, which carried fake ratings.
//
// Usage:  node scripts/add-ranked-prospects.mjs

import fs from "fs";
import path from "path";

const root = process.cwd();
const prospectsPath = path.join(root, "public", "data", "prospects.json");
const inputPath = path.join(root, "scripts", "ranked-prospects.json");

const nameSlug = (n) => String(n || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// 247Sports rating → star bands (247's published methodology).
function starsFromRating(r) {
  if (r == null) return null;
  if (r >= 98) return 5;
  if (r >= 90) return 4;
  if (r >= 80) return 3;
  if (r >= 70) return 2;
  return null;
}

const url247 = (state, cls) =>
  `https://247sports.com/season/${cls}-basketball/RecruitRankings/?InstitutionGroup=highschool&State=${state}`;

// Fabricated demo records seeded early in the project — remove from the public DB.
const DEMO_REMOVE = new Set(["devonplaceholder", "marcussample", "andreexample"]);

const file = JSON.parse(fs.readFileSync(prospectsPath, "utf8"));
const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));

// 1) Drop prior importer records + demo placeholders.
const before = file.prospects.length;
file.prospects = file.prospects.filter(
  (p) => !String(p.source || "").startsWith("industry-rankings") && !DEMO_REMOVE.has(nameSlug(p.name))
);
const removed = before - file.prospects.length;

const bySlug = {};
for (const p of file.prospects) bySlug[nameSlug(p.name)] = p;

let added = 0;
let mergedCount = 0;

for (const pl of input.players) {
  const cls = pl.class;
  const svcIn = pl.services || {};

  // Build per-service entries. 247 stars derived from rating; ESPN keeps grade.
  const services = { "247": null, espn: null, rivals: null };
  if (svcIn["247"]) {
    services["247"] = {
      stars: starsFromRating(svcIn["247"].rating),
      national: svcIn["247"].national ?? null,
      stateRank: svcIn["247"].stateRank ?? null,
      positionRank: svcIn["247"].positionRank ?? null,
      rating: svcIn["247"].rating ?? null,
      url: url247(pl.state, cls),
    };
  }
  if (svcIn.espn) {
    services.espn = {
      stars: svcIn.espn.stars ?? null, // ESPN view has no clean star here
      national: svcIn.espn.national ?? null,
      stateRank: svcIn.espn.stateRank ?? null,
      positionRank: svcIn.espn.positionRank ?? null,
      rating: svcIn.espn.rating ?? null,
      url: (input.espnUrlByClass || {})[String(cls)] || null,
    };
  }
  if (svcIn.rivals) {
    services.rivals = {
      stars: svcIn.rivals.stars ?? null,
      national: svcIn.rivals.national ?? null,
      stateRank: svcIn.rivals.stateRank ?? null,
      positionRank: svcIn.rivals.positionRank ?? null,
      rating: svcIn.rivals.rating ?? null,
      url: svcIn.rivals.url ?? null,
    };
  }

  // Primary star + headline ranks: prefer 247, else ESPN, else Rivals.
  const primary = services["247"] || services.espn || services.rivals;
  const stars = services["247"]?.stars ?? services.espn?.stars ?? null;
  const rankings = {
    national: primary?.national ?? null,
    position: primary?.positionRank ?? null,
    state: primary?.stateRank ?? null,
  };
  const recruiting = { asOf: input.asOf || "2026-05", services };

  const slug = nameSlug(pl.name);
  const existing = bySlug[slug];

  if (existing) {
    existing.name = pl.name; // adopt properly-cased name (e.g. "J'lon" → "J'Lon")
    existing.stars = stars;
    existing.rankings = rankings;
    existing.recruiting = recruiting;
    if (!existing.heightInches && pl.h) existing.heightInches = pl.h;
    if (!existing.weightLbs && pl.w) existing.weightLbs = pl.w;
    if (!existing.position && pl.pos) existing.position = pl.pos;
    mergedCount++;
    continue;
  }

  file.prospects.push({
    id: slug,
    name: pl.name,
    position: pl.pos || null,
    gradYear: cls,
    school: pl.school,
    city: pl.city || null,
    state: pl.state || null,
    county: null,
    heightInches: pl.h ?? null,
    weightLbs: pl.w ?? null,
    wingspanInches: null,
    headshot: null,
    stars,
    rankings,
    aau: null,
    status: "uncommitted",
    commitment: null,
    offers: [],
    traits: [],
    comp: null,
    summary: null,
    statLines: [],
    source: "industry-rankings",
    recruiting,
  });
  added++;
}

fs.writeFileSync(prospectsPath, JSON.stringify(file, null, 2) + "\n");

const ranked = file.prospects.filter((p) => p.recruiting);
console.log(`Removed ${removed} (prior importer + demo placeholders).`);
console.log(`Added ${added} new ranked prospects, merged ${mergedCount} into existing.`);
console.log(`Total prospects: ${file.prospects.length} · with recruiting rankings: ${ranked.length}`);
const byClass = {};
for (const p of ranked) byClass[p.gradYear] = (byClass[p.gradYear] || 0) + 1;
console.log("Ranked by class:", JSON.stringify(byClass));
const withEspn = ranked.filter((p) => p.recruiting.services.espn).map((p) => p.name);
console.log(`With ESPN rank (${withEspn.length}):`, withEspn.join(", "));
