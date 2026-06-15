# Prospera Hoops — Full Feature & System Inventory

Single reference of everything the site is and does, for brainstorming what to add / cut.
Status tags: ✅ live · 🟡 partial · ⛔ deferred/planned · 🔒 locked (shown but intentionally non-functional).

---

## 1. What it is
A **DMV (DC/Maryland/Virginia) high-school & AAU basketball scouting platform** — "the DMV's scouting system of record." Players, teams, stats over time, honest evaluation, shareable recruiting pages, and (planned) a coach analytics tier. Positioned as: track player development in real time + a landing/recruiting home base players claim themselves.

## 2. Tech stack & architecture
- **React 18 + Vite 5 single-page app** (one big `src/App.jsx` + components). No framework router.
- **Data = static JSON in `public/data/`** (served at runtime), produced by scraper/ingest scripts. **No stats database** — the only DB is **Supabase**, used solely for the (dormant) claim/accounts layer.
- **Hosting: Vercel** (`framework: vite`, SPA catch-all rewrite). Build = `vite build && prerender-og`.
- **Routing:** in-memory `view` state + hash deep-links (`#/player/<key>`, `#/team/<slug>`) **and** real **path** routes (`/player/<key>`, `/team/<slug>`) served by prerendered HTML for rich link previews.
- **Live code lives in `C:\LocalDesktop\prospera-preps`**; GitHub repo `commandersbot-design/prospera-hoops`; deploy `prospera-preps.vercel.app`.

## 3. Brand / design system
- Colors: Graphite bg `#0B0E13`, panels `#14181E/#12161C/#171C23`, **Signal Orange `#FF6A1A`**, Rust `#C24A14`, Ink `#11151C`, Muted `#8A929C`, Slate `#5A646E`, Hairline `#20262E`, bar ramp `#9A3E12→#FF6A1A`.
- Fonts: **Saira Condensed** (700/800 — names, numbers, all-caps labels) + **Hanken Grotesk** (body/prose). Tabular-nums on stats.
- Conventions: percentile/efficiency bars fill **orange ≥75th**, **slate** below; small-sample **"Early Read · N GP"** honesty tags always visible; one responsive breakpoint at **900px**.
- PWA manifest, favicon/app icons, OG meta, branded loading screen.

## 4. Navigation (top nav)
**Prospects · Teams · Scout HQ · Recaps · Map · Classes · Commitments** (+ hidden **Admin** "Claims" for admins). News ticker bar across the top with live leaders/headlines. Global search box (players + schools).

---

## 5. Player profile — "Scout Dashboard" ✅
Two-column at ≥900px, single column below. Opened from anywhere a name appears; shareable at `/player/<key>`.
- **Left rail (sticky):** photo (initials fallback on `#1B2129`), name (Saira 800), **archetype role pill** (orange outline) + **Early Read · N GP** tag, measurables grid (POS/CLASS/HT/WT/WING), school · city, state · status (orange if Uncommitted), **DMV Intel** (circuit · district), **stat tiles** (PPG/RPG/APG).
- **Right column:** action bar (← Back · **Share** · **Verify Player** · **Mark Gold Tier** · **Claim Profile**; Verify/Gold are admin trust marks, Claim is the primary orange CTA).
- **Tabs:** Overview / Development / Game Log / Film.
  - **Overview:** (1) Scout Snapshot (orange left border), (2) **Production in Context** — percentile bars vs the same-level cohort ("vs N summer-league players"), low bars always shown, (3) **The Leap** — prior-season → summer averages with +deltas in orange, (4) **By the Numbers** — Season Averages (PPG/RPG/APG/SPG/BPG/TOPG), Shooting (FG/FG%/3PT/3P%/FT/FT%/eFG%/TS%), Role & Efficiency (AST:TO, TOV%, PTS MIX), Season Highs (PTS/REB/AST + opponent).
  - **Development:** multi-season development arc (TS%/per-36/efficiency over time) + by-season table.
  - **Game Log:** per-game box score table (date, opp, result, MIN, PTS, REB, AST, STL, BLK, TO, FG/3P/FT) + minutes summary (MPG/total/GP/GS).
  - **Film:** embeds; "search YouTube" fallback when none.
- **Stats are split by competition context** — each context (HS / Summer / AAU) renders its own labeled By-the-Numbers block; HS weighted most, summer flagged "exhibition — lighter weight"; never blended.
- **Related Players** (same school / AAU / class) discovery rail.

## 6. Team pages — "Team HQ" ✅
Full-width page when a team is clicked (was a side-rail preview).
- **Header:** name, **level badge** (HS/Summer/AAU), **record W–L** (computed from games), circuit · season · region · GP · coach, **Share Team** button.
- **Inner tabs:** **Roster** (default) · **Matchups** (played games, W/L + score, newest first, + recaps) · **Schedule** (upcoming games, tip times).
- **Roster tab:** sortable roster table (PLAYER | GP | PPG | RPG | APG | FG% | TS%; FG%/TS% "—" when untracked; **top scorer's row highlighted**; archetype shown per row; "early" flag at low GP). Then **Leaders** as 3 stat cards (big orange number + unit + leader + role). Then **Top Performances** cards (best single-game scoring lines).

## 7. Teams workspace (the "Teams" tab) ✅
- Lands on the **team list** (full-width grid of ~373 programs: 60 Capitol Hoops summer teams + ~313 DMV high schools as HS-level entries + AAU programs as loaded).
- **Filters (facets):** **Level** (HS/Summer/AAU), **Region** (DC/MD/VA), **Watchlist** (My tracked / Gold tier). Empty = show all; clicking filters in; multiple = OR. (Class facet intentionally removed — that's a player attribute.)
- Top toggle: **Teams | Schedule** (league-wide slate). Map pins deep-link here.

## 8. Other views
- **Prospects** ✅ — player board/leaderboard with its own facets (state / position / class), sortable, gold-tier banding.
- **Recaps** ✅ — DMV game-recap feed (scraped: recaps, previews, team features); attached to schedule + team pages (CoverageList).
- **Map** ✅ — Leaflet + marker-cluster map of DMV schools; pins deep-link into the Teams workspace.
- **Classes** ✅ — recruiting classes view.
- **Commitments** ✅ — commitment/signing tracker with status badges (uncommitted/committed/signed); per-player offers shown on profiles.
- **Schedule** ✅ — full league slate (results + upcoming).
- **News ticker** ✅ — auto top-performer + headline marquee.

## 9. Analytics & metrics systems
- **Stats engine** ✅ — season aggregates + advanced from box scores: GP, PPG/RPG/APG/SPG/BPG/TOPG, FG/3P/FT%, **eFG%, TS%**, **per-36** (when minutes exist), AST:TO, TOV%, scoring mix. `pts = 2·fgm + tpm + ftm`, `reb = oreb+dreb`.
- **Archetype classifier** ✅ — descriptive role tags, percentile-calibrated **per competition level** vs the real DMV cohort (697-player pool), 16 ordered rules, "early read" flag for <5 GP, never a ranking. Tags: Primary Shot Creator, Lead Playmaker, Primary Scorer, Sharpshooter, Floor Spacer, 3&D Wing, Two-Way Wing, Slasher/Foul-Drawer, Stretch Big, Rebounding Big, Glass Cleaner, Defensive Anchor, Low-Usage Glue, Rotation Contributor, (no tag for limited role). Reproduce/tune with `calibrate-archetypes.mjs`.
- **DMV cohort percentiles** ✅ — real (not fabricated), scoped to the same competition level.
- **Development arc** ✅ — season-over-season, efficiency-first, GP-gated (the longitudinal moat).
- **Records & milestones** ✅ — season highs (PTS/REB/AST/3PM + opponent), 20/30-pt game counts, double/triple-doubles, team top performances, team record.
- **Competition-context weighting** ✅ — HS (3) > AAU (2) > Summer (1); stats/percentiles/archetypes computed within each context, never mixed.
- **Honesty rules** ✅ — no fabricated precision; "self-reported" vs "Verified" measurables; estimates labeled (e.g. usage); shot-creation context (movement vs spot-up) explicitly NOT claimed from box scores; small-sample gating everywhere.
- Full spec: `docs/metrics-blueprint.md`.

## 10. Accounts / claim-your-profile 🟡 (built, dormant until configured)
- **Claim flow** — player/parent/coach claims a profile → owner approves → self-edit. Lightweight email-form fallback when Supabase unconfigured.
- **Supabase self-serve layer** (`src/lib/auth.jsx`, `supabaseClient.js`, `profiles.js`): magic-link sign-in, `claims` table, `profile_overrides` (bio, film links, contact, socials, self-reported measurables, recruiting status), Row-Level Security, contact private-by-default via masked view. `/admin` claim-approval screen (admins only). Activates once two env vars are set (see `docs/turn-on-profiles-PROMPT.md` / `supabase-setup.md`). Schema: `supabase/schema.sql`.
- **Admin/owner tools** ✅ (localStorage now): **Verify Player** (scout-verified badge), **Mark Gold Tier** (manual "elite/apex" mark — your conviction, not auto-derived).

## 11. Share cards & link previews ✅
- **Player trading card** — 1080×1350 PNG (orange band PROSPERA HOOPS / 'class, photo/initials, nameplate + role pill, PPG/RPG/APG/TS% strip). `npm run cards -- --team <t>` → `public/og/players/<key>.png`.
- **Team share card** — 1080×1350 PNG (orange band, name, level, **record**, league, 3 leader blocks, footer). → `public/og/teams/<slug>.png`.
- **Recap cards** — per-game W/L + top performers + auto caption (→ `cards/<team>/recaps/` + `recap-captions.txt`).
- **Dynamic og:image** — `prerender-og.mjs` writes `dist/player/<key>/` and `dist/team/<slug>/` per-page HTML with the card as og:image, so shared links preview rich (crawlers get per-page meta without a runtime function). 902 player + 60 team pages prerendered.
- **Shareable links** — Share buttons copy `/player/<key>` and `/team/<slug>`.
- Brand asset download page at `/brand/` (logos, social images, IG templates).

## 12. Data pipeline & tooling (scripts)
- `ingest.mjs` (`npm run ingest`) — CSV workbook → JSON (roster/schedule/boxscores); recomputes season averages; idempotent; `--level/--circuit/--season` flags; replaces only that team's games (multi-context safe).
- `seed-intake.mjs` — reconstruct a team's workbook CSVs from existing scraped logs.
- `gen-intake-template.py` — generate a coach Excel workbook (pre-filled roster or `--new` blank) with Start Here / Roster / Schedule / Box Score tabs + consent blurb.
- `gen-cards.mjs` (`npm run cards`) — player + team + recap PNGs.
- `prerender-og.mjs` — per-page og HTML (runs in build).
- `migrate-circuits.mjs` — tag teams/games with level/circuit/season.
- `calibrate-archetypes.mjs` — recompute/preview archetype thresholds vs the cohort.
- Scrapers: `scrape-capitol-hoops` (teams+stats), `scrape-player-gamelogs` (per-game), `scrape-recaps`, `scrape-dmv-schools` (MaxPreps directory), `scrape-hayfield-photos`; geocoders for the map; `gen-social.mjs` (social images); plus `add-news`, `build-schedule`, `promote-from-capitol-hoops`, `drop-graduated`, `cleanup-school-names`, `add-ranked-prospects`.

## 13. Data files (`public/data/`)
`capitolHoops.json` (teams keyed by slug → players → stats, now tagged level/circuit/season), `gameLogs.json` (per-player per-game box scores, tagged team/level), `gameRecaps.json`, `prospects.json`, `dmvSchools.json` (~306-school directory), `schoolLocations.json` (geocodes). Bundled: news, teamStats, schedule, officialSchoolNames, prospectFilm.

## 14. Pilots & coach intake
- **Hayfield** = HS pilot, fully loaded (workbook-owned, live end-to-end).
- **Washington Warriors 3SSB** (formerly Prospect U) + **AKT** = AAU pilots — blank coach workbooks generated (`docs/*-Intake-Template.xlsx`), rosters not loaded yet.
- Weekly loop: coach fills workbook → `npm run ingest` → pages/cards update → `npm run cards` to post.

---

## 15. Deferred / planned / locked
- ✅ **Scout HQ** (live, v2 tier) — coach analytics, nav tab. Tabs **Opponents · Matchups · Players · My Team · Lists & Notes**. Editable opponent reports (computed "est" playstyle from box scores + coach scouting input + auto/coach-tagged keys), matchup builders (Team compare w/ column picker / 5-on-5 custom lineups / 1-on-1), player multi-compare w/ percentile bars, my-team inward view (efficiency leaders/laggards + auto strengths/watch), lists/notes/custom-fields. Persistence localStorage (`prospera.scoutHQ.v1`). 🔒 **Locked cards** (shown, never faked): true 5-man lineup efficiency, on/off, net rating, real player-vs-defender head-to-head. 🟡 Remaining: matchup PNG export / saved-matchups browser / game-prep template / <900px stacked pass; localStorage→Supabase.
- ⛔ **Full self-serve accounts** — player logins / instant self-edit / film uploads (needs the Supabase layer turned on + Phase 4–5 of `docs/self-serve-profiles-spec.md`).
- ⛔ **Big Board / rankings** — parked (gold tier is the only manual apex mark for now).
- ⛔ **Verified measurables / combine** — a "Prospera Verified" measurement event (moat).
- ⛔ **Scout-tagged shot type** — true movement-vs-spot-up (needs observed input, not box scores).
- ✅ **Mobile roster-as-list** — team roster reflows to a stacked list under 900px (name + pos·class·role left, PPG/RPG/APG right, top scorer highlighted, 44px rows); no horizontal scroll.
- ⛔ **Payments, AAU-wide expansion, opponent-adjusted splits, coach alerts/search.**

## 16. Open questions / idea space (what to add or cut)
- Is the 373-team browse grid too heavy? (pagination / virtualize / "has stats" sort-to-top.)
- Recruiting tracker depth — dedicated `/recruiting` offers feed + add-form vs current commitments view.
- Leaderboard placement now that the "Players" sub-tab was removed (lives under Prospects).
- Per-player multi-context UI (HS vs Summer side-by-side) only activates once overlapping data loads.
- Do AAU/circuit programs need crests/logos for cards (currently text only)?
- Coach view / private team dashboard (precursor to Scout HQ).
- Photo pipeline (consented headshots) — currently initials fallback everywhere.
- Notifications / "what changed this week" digest for families & coaches.
