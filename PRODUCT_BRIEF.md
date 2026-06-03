# Prospera Preps — Product Brief

*A paste-anywhere description of the product as it exists today. Drop this into any
LLM (or hand it to a collaborator) and ask it to brainstorm features, positioning,
monetization, or growth. Everything below reflects the actual codebase, not a pitch.*

---

## One-liner

**Prospera Preps is a recruiting & scouting database for DMV (D.C. / Maryland /
Virginia) high-school basketball** — player profiles, summer-league stats, school
rosters, a talent map, and recruiting-class browsing, in a single fast web app.

Think "247Sports / On3 for the DMV grassroots scene," but built lean and
data-first, currently anchored by **Capitol Hoops Summer League** data.

---

## Who it's for

- **Players & families** — a public profile that shows their stats, film, and
  recruiting status; a place college coaches can be pointed to.
- **College recruiters / scouts** — one searchable board of DMV talent with
  measurables, grad year, position, and real box-score numbers.
- **Local hoops community** — fans, trainers, AAU/HS coaches following the
  summer-league season, scores, and standings.

The audience skews local and **multi-generational** — parents, grandparents, and
older coaches are a meaningful slice, so readability and trust matter as much as
depth.

---

## What it does today (live features)

Navigation tabs:

1. **Big Board** — ranked prospect tiers. Currently a "coming soon" placeholder;
   rankings are being **hand-authored** (only ~20 of 854 prospects have star
   grades so far).
2. **Prospects** — the full searchable database: **854 tracked players** across
   grad classes 2027 (309), 2028 (318), 2029 (162), 2030 (55). Search by name.
3. **Summer League** — the heart of the app right now. Capitol Hoops Summer
   League: **60 teams, 875 players**, browsable team-by-team with rosters +
   per-game box-score averages, plus **statistical leaderboards** across the
   whole league and a **full schedule/results** view (240 games).
4. **Schools** — every DMV school in the database (**70 schools**), each with its
   roster and both HS-season and summer stats.
5. **Map** — a Leaflet talent map plotting schools by real geocoded coordinates.
6. **Classes** — browse the database by graduating class.
7. **Commitments** — prospects who've committed/signed (tracks the recruiting
   class as decisions roll in).

**Player profile pages** have two tabs:
- **Overview** — scout summary, pro comparison, trait grades, "stats by context"
  (HS season + Capitol Hoops summer, matched automatically by name), and offers.
- **Film** — embedded video clips (3 players have film so far).

Plus a scrolling **news ticker** and auto-surfaced "top summer performers."

The data philosophy is explicit in the code: **only real/derivable facts are
written automatically** (name, position, grad year, school/location, scraped
stats). Everything *evaluative* — rankings, stars, offers, traits, pro comps,
scouting summaries — is **hand-authored and never fabricated.** Most profiles are
therefore "in progress": real stats where available, evaluations pending.

---

## How the data works (this is the real moat / the real chore)

The app is **static JSON served at runtime** — no backend, no database. Node
scraper scripts regenerate the JSON from public sources:

| Script | Produces | Notes |
|---|---|---|
| `scrape-capitol-hoops.mjs` | `capitolHoops.json` | 60 teams, rosters + stats, scraped from the league's SportsPress site |
| `build-schedule.mjs` | `schedule.json` | **Now scrapes the live `/schedule/` page** (240 games) — no more manual paste |
| `promote-from-capitol-hoops.mjs` | prospect stubs | Creates a profile for every summer player not already tracked |
| `geocode-schools.mjs` | `schoolLocations.json` | Lat/long for the map |
| `add-news.mjs`, `add-ranked-prospects.mjs`, `cleanup-school-names.mjs`, `drop-graduated.mjs`, `scrape-hayfield-photos.mjs` | misc | News, rankings import, name normalization, graduation cleanup, headshots |

**Canonical entity = the prospect** (keyed to their high school, their home base —
not their summer team). Summer stats *join at render time by name match*, so
refreshing one JSON file updates stats everywhere.

**Known friction:** stats are only as current as the source publishes; the league
site lags a day or two behind games. Refresh = re-run the scraper, rebuild,
redeploy. There is no automation/cron yet — it's a manual pull.

---

## Tech stack

- **Frontend:** React 18 + Vite 5, Tailwind (utility classes) + a CSS-variable
  design-token system (`src/styles/tokens.css`), Leaflet + markercluster for the
  map. Single-page app, hash/state routing.
- **Styling:** every color reads from `var(--prospera-*)` tokens — one file
  controls the whole palette. Current look is a dark "Bloomberg/Bloomberg-terminal"
  aesthetic with a Signal-Orange accent.
- **Data:** static JSON in `public/data/` (large, fetched at runtime) and
  `src/data/` (small, imported at build).
- **Hosting:** Vercel (`npm run build` → `dist/`), SPA rewrite to `index.html`.
- **No backend, no auth, no DB, no analytics** currently.

---

## Current state / maturity

- ✅ Summer-league stats, leaderboards, schedule/results — live and auto-scraped.
- ✅ 854 prospect profiles auto-generated with real bio + stats.
- ✅ Mobile-optimized (header, nav, map recently tightened for phones).
- 🟡 Rankings, scouting reports, measurables, pro comps — hand-authored, mostly
  pending.
- 🟡 Film — only a handful of players.
- ❌ No accounts, no claim-your-profile, no notifications, no automation, no
  monetization, no non-basketball sports (the repo *mentions* football in its
  description but nothing is built).

---

## Constraints & principles to respect when brainstorming

- **Never fabricate evaluative data.** Stars/rankings/comps must be human-authored.
- **Stay lean** — static JSON + scrapers has zero hosting cost and no ops burden;
  proposals that demand a full backend should justify the trade.
- **Source-dependent** — live data is bounded by what the league site publishes.
- **Local-first** — the DMV focus is the wedge; depth in one region beats thin
  national coverage.

---

## Open questions worth brainstorming against

- How does this become a **product** (retention, a reason to return weekly) vs. a
  reference site?
- **Who pays, and for what?** (Recruiters? Families wanting a premium/verified
  profile? Trainers/AAU programs? Sponsors/local businesses?)
- What's the **single most valuable feature** to build next given a hand-authored
  ranking bottleneck and a multi-generational, partly-older audience?
- How to **automate the data refresh** so stats are never stale.
- Should it **expand** (football, girls' hoops, other regions, HS winter season)
  or **deepen** (rankings, film, recruiting timelines, alerts) first?
- What earns **trust** with college coaches enough to make this a real recruiting
  channel?

---

*Generated from the live codebase on 2026-06-03.*
