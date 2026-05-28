// Add ranked DMV recruits (from scripts/ranked-prospects.json) into the
// prospect database, with per-service recruiting rankings + derived stars.
//
// Source: 247Sports public ranking pages (see ranked-prospects.json README).
// Stars are derived from 247's numeric rating using 247's published bands —
// never guessed. ESPN / Rivals are left null (they block automated access);
// the schema holds them so they can be filled later from a verifiable source.
//
// Idempotent: matches existing prospects by name-slug. If a player already
// exists (e.g. a Capitol Hoops summer record), their recruiting block + stars +
// rankings are merged in without creating a duplicate. New players are appended.
//
// Usage:  node scripts/add-ranked-prospects.mjs

import fs from "fs";
import path from "path";

const root = process.cwd();
const prospectsPath = path.join(root, "public", "data", "prospects.json");
const inputPath = path.join(root, "scripts", "ranked-prospects.json");

const nameSlug = (n) => String(n || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// 247Sports rating → star bands (per 247's published methodology).
function starsFromRating(r) {
  if (r == null) return null;
  if (r >= 98) return 5;
  if (r >= 90) return 4;
  if (r >= 80) return 3;
  if (r >= 70) return 2;
  return null;
}

const stateRankUrl = (service, state, cls) =>
  service === "247"
    ? `https://247sports.com/season/${cls}-basketball/RecruitRankings/?InstitutionGroup=highschool&State=${state}`
    : null;

const file = JSON.parse(fs.readFileSync(prospectsPath, "utf8"));
const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const cls = input.class;
const service = input.service || "247";

const bySlug = {};
for (const p of file.prospects) bySlug[nameSlug(p.name)] = p;

let added = 0;
let merged = 0;

for (const pl of input.players) {
  const stars = starsFromRating(pl.rating);
  const serviceEntry = {
    stars,
    national: pl.national ?? null,
    stateRank: pl.stateRank ?? null,
    positionRank: pl.posRank ?? null,
    rating: pl.rating ?? null,
    url: stateRankUrl(service, pl.state, cls),
  };
  const recruiting = {
    asOf: input.asOf || null,
    services: { "247": null, espn: null, rivals: null },
  };
  recruiting.services[service] = serviceEntry;

  const rankings = {
    national: pl.national ?? null,
    position: pl.posRank ?? null,
    state: pl.stateRank ?? null,
  };

  const slug = nameSlug(pl.name);
  const existing = bySlug[slug];

  if (existing) {
    // Merge recruiting data onto the existing record (don't duplicate).
    existing.stars = stars;
    existing.rankings = rankings;
    existing.recruiting = recruiting;
    if (!existing.heightInches && pl.h) existing.heightInches = pl.h;
    if (!existing.weightLbs && pl.w) existing.weightLbs = pl.w;
    merged++;
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
    source: "industry-rankings-2026",
    recruiting,
  });
  added++;
}

fs.writeFileSync(prospectsPath, JSON.stringify(file, null, 2) + "\n");

const ranked = file.prospects.filter((p) => p.recruiting);
console.log(`Added ${added} new ranked prospects, merged ${merged} into existing.`);
console.log(`Total prospects: ${file.prospects.length} · with recruiting rankings: ${ranked.length}`);
const byStars = {};
for (const p of ranked) byStars[p.stars] = (byStars[p.stars] || 0) + 1;
console.log("Stars:", JSON.stringify(byStars));
