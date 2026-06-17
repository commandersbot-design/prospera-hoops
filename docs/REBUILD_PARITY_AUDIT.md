# Rebuild ↔ Old-site parity audit

Full feature-by-feature comparison of the **old app** (`src/App.jsx` + `src/components/*`)
against the **rebuild** (`src/rebuild/RebuildApp.jsx`). Goal: nothing the old site
did is silently lost before launch.

Status key: ✅ at parity · 🔧 added/fixed this session · ⏳ deferred post-launch (with reason)
· ◻️ intentional design change (prototype-driven, not a regression).

**Verdict:** the rebuild is launch-ready for demos. All P0 player/coach/data surfaces are
at parity or better. Remaining gaps are admin tooling and not-yet-built premium features
that the old site also only stubbed — listed under "Deferred" with reasons.

---

## 1. Landing / global chrome
| Feature | Status | Note |
|---|---|---|
| Header, nav (Home/Prospects/Teams/Coach HQ), sticky blur | ✅ | |
| Mobile hamburger menu | 🔧 | added — nav was `display:none` ≤680px with no fallback |
| Logo → home, account avatar / Log in / Log out | ✅ | wired to real auth |
| Hero: eyebrow, H1, lede, search + results, Claim CTA, founding band | ✅ | |
| Lede tagline "No fake rankings. No hype." | 🔧 | restored |
| Featured Scout Card | ✅ | |
| "The Board" coverage stats, marquee, "A Real Profile", "For Coaches", "Founding 50" | ✅ | |
| Footer (stamp, links, note) | ✅ | links are labels; wire destinations post-launch ⏳ |
| OG / Twitter / canonical / manifest / theme-color meta | ✅ | `index.html` unchanged, correct |
| News ticker | ⏳ | old had a live ticker; low value pre-launch, no live feed yet |
| "Summer Scoring Leaders" carousel on landing | ◻️ | the leaders list now lives in Coach HQ; prototype landing is intentionally lean |

## 2. Player profile  (`PublicProfile`)
| Feature | Status | Note |
|---|---|---|
| Scout Card (portrait, stats, percentiles, badges) | ✅ | |
| Claim banner → real claim flow; pending/owned states | 🔧 | Supabase magic-link |
| Stats in context (HS / Summer / AAU tabs) | ✅ | |
| Percentiles vs DMV peers + Archetype + why | ✅ | ×100 fix verified |
| **Scouting Report**: measurable tiles, "Unverified" note, location + commitment, DMV Intel | 🔧 | matches old left-rail |
| **Recruiting · services** (stars, national/state/pos rank, offers) | 🔧 | conditional — only when real service data exists (21 players); honest, attributed |
| **By the Numbers** (full box score: averages, shooting, role/eff, highs) | 🔧 | reuses `seasonStatLine` engine |
| **The Leap** (prior→latest season deltas) | 🔧 | renders for 216 multi-season players |
| **Game Log** (every game, W/L, FG/3PT, expandable) | 🔧 | replaced top-6 "recent games" |
| Development Arc | ✅ / gated | real `DevelopmentSection`, unlocked with Prospera+ |
| Film | ⏳ | placeholder; no real film URLs in data yet |
| 3-column sticky-rail + tab layout | ◻️ | prototype is single-column by design (your call: "exactly as pasted") |
| Share button, related/similar players, academics block | ⏳ | nice-to-have; data thin (no GPA/film); add post-launch |

## 3. Prospects / board  (`ProspectsView`)
| Feature | Status | Note |
|---|---|---|
| Button filters: DC/MD/VA, G/W/F, class, ☆ tracked | ✅ | C falls under F bucket |
| Sort: Ranked / PPG / A–Z | ✅ | "Ranked" shows honest "not yet evaluated" framing |
| Search (name/school) | ✅ | |
| Rows: headshot, name, pos, class, school, PPG, star badge | ✅ | stars + national rank shown when present |
| 250-row cap | ⏳ | fine for current board size; add load-more if board grows |
| Commitment column in row | ⏳ | shown on profile; minor for the row |
| CSV/print export | ⏳ | Coach-tier `board_filters_export`, post-launch |

## 4. Teams / schedule  (`TeamsView`, `TeamDetail`)
| Feature | Status | Note |
|---|---|---|
| Teams directory + search; TEAMS / SCHEDULE button toggle | ✅ | |
| Team detail: roster + stats, schedule & results | ✅ | |
| Date-aware schedule, scores, ghost-game hiding | ✅ | wired to real `schedule.json` (240 games) |
| Schedule labeled "Capitol Hoops Summer League" | 🔧 | + note that more circuits come online later |
| Standings / power-ranking table | ⏳ | W-L shown per team; league standings post-launch |

## 5. Coach HQ  (`CoachHQ`)
| Feature | Status | Note |
|---|---|---|
| Opponent Scouting (record, threats w/ bars, game-plan read, recent form) | ✅ | + league-leaders board fills the empty default |
| Matchup Builder → **Team vs Team** | ✅ | record/PPG/top-scorer/roster edge |
| Matchup Builder → **Custom 5-on-5** | 🔧 | search-add lineups + projected PPG edge |
| Matchup Builder → **1-on-1 read** | 🔧 | head-to-head compare + persistent "battle" notes |
| My Team (leaders, tendencies, strengths/watch-areas) | ✅ | |
| Lists & Notes (watchlist + persistent notes + board) | ✅ | localStorage |
| Paywall: Matchup + My Team gated; Opponent Scouting + Lists free | 🔧 | Coach tier $19/mo, pilot code, or admin |
| Saved-matchup history / export | ⏳ | post-launch |

## 6. Monetization / tiers / auth
| Feature | Status | Note |
|---|---|---|
| Prospera+ ($5/mo·$39/yr, 30-day trial) checkout | ✅ | Stripe REST; live once keys set |
| Coach HQ ($19/mo·$149/yr) checkout | ✅ | Stripe REST; live once keys set |
| Dev Arc gated on Prospera+ (`hasPlus`) | ✅ | |
| Coach tools gated on Coach access (`hasCoach` + pilot code + admin) | ✅ | |
| Entitlement webhook → `entitlements` table | ✅ | needs the SQL + service-role key (see STRIPE_SETUP.md) |
| Claim → magic-link login → pending/approved | ✅ | |
| Badges (Founding / Verified Account / Verified Stats) | ◻️/⏳ | render; "Verified" identity step + admin approval = post-launch |
| Admin claim-review UI | ⏳ | approve claims via Supabase directly for now |
| who-viewed-you · one-pager PDF · alerts · extra film | ⏳ | listed as Prospera+ benefits; not built (old site also stubbed these) |
| College/Program tiers | ⏳ | not self-serve; concierge, post-launch |

---

## Pre-launch checklist (tomorrow)
1. **Stripe** — add the 4 price IDs + secret + webhook secret + service-role key, run the
   `entitlements` SQL. See [STRIPE_SETUP.md](STRIPE_SETUP.md). Until then checkout degrades
   to "opens at launch" (nothing charged).
2. **Go-live** — set `VITE_PRELAUNCH=false` in Vercel (Production) and redeploy on 06.18.
3. **Merge** `rebuild` → `main` (still gated by the prelaunch flag until step 2).
4. Optional smoke: claim a profile, open Coach HQ with a pilot code, share a `/p/:player` link.

## Explicitly deferred to post-launch (with reason)
- **Film player** — no real film URLs in the dataset yet.
- **who-viewed-you / one-pager PDF / alerts** — Prospera+ benefits, not yet built (old site stubbed them too); safe to ship as "included with Prospera+".
- **Admin claim-review + Verified-identity badge** — approve via Supabase for launch; build UI after.
- **News ticker, related players, academics, board export, standings** — additive, not regressions.
