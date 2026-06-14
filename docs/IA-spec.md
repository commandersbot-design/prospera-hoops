# Prospera Hoops — Information Architecture Spec

The blueprint for the player profile + platform structure. Written for three real
audiences, anchored to the honesty rules (nothing fabricated; verified vs. self-reported
is always distinguishable; estimates are labeled; missing data degrades gracefully).

This doc drives the profile redesign (3-column command center / stacked-mobile cards)
and the verified-badge + academic rail. Status tags: ✅ live · 🟡 partial · ⛔ planned.

---

## 1. Three audiences, three jobs-to-be-done

| Audience | They open a profile to… | They scan for (in order) | Failure mode to avoid |
|---|---|---|---|
| **College coach / scout** | Verify & qualify a lead in <30s, then decide "dig deeper or pass" | 1. Class + position + measurables (is he the right age/size?) · 2. **Verified** flags (can I trust these numbers?) · 3. Eligibility/academics (can he get in?) · 4. Film · 5. Efficiency & role | Looking like a fan blog. Coaches bounce on unverifiable hype and missing class/measurables. |
| **Player / parent** | Use it as a high-end athletic résumé to share & get recruited | 1. Does this look prestigious? · 2. Are my best numbers up top? · 3. Can I share it in one tap? · 4. Can I claim/edit it? | Looking sparse or "auto-generated." An empty profile feels like neglect. |
| **HS / AAU coach** | Manage a roster, point recruiters at their kids | 1. Team page with all players · 2. Are my players' stats current? · 3. Scout HQ for game prep | Friction to update. If the data's stale they stop trusting it. |

**Design consequence:** the profile must satisfy the coach's *verification scan* and the
player's *prestige* need on the **same screen**, without either compromising the other.
That is the central tension this IA resolves.

---

## 2. The two-surface model (the core split)

Every piece of player information belongs to exactly one of two surfaces. Naming them
keeps decisions consistent.

### Surface A — **Public Brand** (the résumé)
Optimized for prestige, scannability, and sharing. This is what loads at `/player/<key>`
and what the share card renders.
- Identity: photo, name, archetype role, class, status (committed/uncommitted).
- Measurables: HT / WT / WING (+ ⛔ vert, lane agility) — each carries a **verification state**.
- Headline production: PPG / RPG / APG (the level that carries the most weight).
- Academics & eligibility: ⛔ GPA, test status, NCAA ID, grad year — **self-reported until verified**.
- Film: highlight reel embed + clips.
- Recruiting: offers, commitment, industry rankings (247/ESPN), contact (gated).

### Surface B — **Deep Scout Analytics** (the evaluation)
Dense, honest, coach-facing. Lives in the **profile's lower tabs** and in **Scout HQ**.
- Production-in-context (DMV percentiles, per level). ✅
- The Leap (season-over-season trajectory). ✅
- Full box: shooting (eFG%/TS%), role/efficiency (AST:TO, TOV%, mix), highs. ✅
- Per-game game log. ✅
- Development arc. ✅
- 🔒 Locked (shown, never faked until data exists): true lineup efficiency, on/off, defender H2H.

**Rule:** Surface A answers *"is this kid worth my time?"* in 30 seconds. Surface B answers
*"how good is he, really?"* for the coach who stayed. Never let B's density bleed into A's
first screen.

---

## 3. Profile screen IA — section priority

Sections in **evaluative priority order** (what a coach needs first), which is also roughly
the mobile stacking order. Desktop reorganizes these into 3 columns (§4).

1. **Identity block** — photo, name, archetype pill, Early-Read tag, class/pos. *(Surface A)*
2. **Verified measurables** — HT/WT/WING/vert, each with a verified ✓ / self-reported ◦ state. *(A)*
3. **Headline stats** — PPG/RPG/APG, top-weighted level, GP tag. *(A)*
4. **Academics & eligibility** — GPA, test, NCAA ID, grad year, intended major. *(A, mostly ⛔)*
5. **Film** — highlight reel + clips (or a clean "request film" empty state). *(A)*
6. **Recruiting** — status, offers, commitment, industry ranks, contact (gated). *(A)*
7. **Production in context** — percentile bars vs same-level DMV cohort. *(B)*
8. **The Leap** — trajectory. *(B)*
9. **By the numbers** — shooting / role / efficiency / highs, split by competition level. *(B)*
10. **Game log** — per-game box scores. *(B)*
11. **Development** — multi-season arc. *(B)*
12. **Related players**. *(navigation)*

Tabs group 7–11 so the first screen stays Surface A. Current tabs (Overview / Development /
Game Log / Film) stay; Overview leads with A, then folds B's snapshot+context below.

---

## 4. Responsive layout rules

One breakpoint at **900px**. Touch targets ≥ 44px. Tabular-nums on all stats.

### Mobile (< 900px) — vertical bite-sized portfolio
- Single column. Sections stack in the §3 priority order.
- Dense blocks (measurables, academics, deep stats) become **collapsible cards** — open the
  top 1–2, collapse the rest, so a player isn't doomed to infinite scroll.
- Headline stats render as a 3-up tile row (already the rail pattern), not a wide table.
- Tabs are a horizontal-scroll selector pinned under the identity block.

### Desktop (≥ 900px) — 3-column command center
Utilize width; never stretch a single column of prose across 1200px.
- **Left (≈ 300px, sticky):** Bio & Academics — identity, measurables (verified), academics/
  eligibility, headline tiles, school/intel. *(Surface A "card stack")*
- **Middle (fluid, widest):** the **active surface** — Film reel up top, then the selected tab's
  content (Overview snapshot+context, Game Log, Development).
- **Right (≈ 320px):** Deep Scout Metrics — percentile bars, The Leap, shooting/efficiency
  table, recruiting ranks. The numbers a scout cross-checks against the film.

> Current build is 2-column (sticky rail + tabbed right). The redesign promotes the right
> column into **middle (film/active) + right (metrics)** on wide screens, collapsing back to
> the existing 2-col between ~900–1200px and to 1-col below 900px.

Scaling guarantee: **no data is dropped** going mobile→desktop and **no column is stretched**
going desktop→mobile. Every section has a home in all three widths.

---

## 5. Verification & trust model (the coach's #1 need)

Three states per data point, always visually distinct:

| State | Meaning | Treatment |
|---|---|---|
| **Verified** ✓ | Measured by Prospera staff (or pulled from an official source) | Green check + "Verified" — the trust signal coaches scan for |
| **Self-reported** ◦ | Player/parent entered it via claim | Neutral dot + "Self-reported" — honest, not penalized |
| **Unknown** — | No data | Em-dash placeholder or hidden (see §6) |

- Applies per-metric (a player can have verified HT but self-reported wingspan).
- The existing **Verify Player** toggle is scout-level trust on the *record*; this adds
  **per-metric** granularity for measurables/academics.
- **Gold tier** is separate: the user's manual apex conviction, never automated.

---

## 6. Empty-state & data-completeness system

Incomplete profiles must still look intentional. Decision rule per field:

- **Core identity fields** (name, class, pos): always shown; em-dash if missing — but these
  should never be missing on a real prospect.
- **Measurables / academics** (wingspan, vert, GPA, test): if missing, show a **labeled slot**
  with the field name and an em-dash *only when the section as a whole has some data*; if the
  **entire** section is empty, collapse it to a single quiet "Add your measurables / academics"
  prompt (for the owner) or hide it (for the public viewer). Never render a grid of em-dashes.
- **Film:** if none, show a branded "Film coming soon — request an invite to add tape" card,
  not a blank box.
- **Deep stats:** gated on GP. Below the sample threshold, keep the **Early Read · N GP** tag
  and show what exists; never invent percentiles.
- **Principle:** a profile with only a name + class should look like a *new* profile, not a
  *broken* one. Polish comes from consistent containers, not from filling every field.

---

## 7. Navigation IA (platform level) ✅ mostly live

Top nav: **Prospects · Teams · Scout HQ · Recaps · Map · Classes · Commitments** (+ hidden Admin).
- **Prospects** = the board/leaderboard (discovery of *players*).
- **Teams** = team list + schedule, HS/AAU/Summer facets (discovery of *programs*).
- **Scout HQ** = Surface B at the team/matchup level (coach tier).
- **Recaps / Classes / Commitments** = recruiting & narrative context.
- Global search spans players + schools. Map deep-links into Teams.

Deep-link contract: `/player/<key>` and `/team/<slug>` are real prerendered pages (rich
previews). Hash routes mirror them in-app. The profile **is** the share target — so Surface A
must be self-explanatory to a cold visitor arriving from a shared link.

---

## 8. Design tokens (handoff reference)

Colors: Graphite bg `#0B0E13`; panels `#14181E/#12161C/#171C23`; **Signal Orange `#FF6A1A`**;
Rust `#C24A14`; Muted `#8A929C`; Slate `#5A646E`; Hairline `#20262E`; positive/verified green
`#10B981`; gold ramp `#f1e3a8→#d2af52→#a9842f`. Bar ramp `#9A3E12→#FF6A1A`.

Type: **Saira Condensed** 700/800 (names, numbers, all-caps labels) + **Hanken Grotesk** (body).
Tabular-nums on stats.

Conventions: percentile bars orange ≥75th / slate below; **Early Read · N GP** always visible;
verified ✓ green / self-reported ◦ neutral; one 900px breakpoint; player photo **4:5**; cards
1px hairline border, 8–10px radius, panel-surface bg.

Button states (touch + click): default (hairline border, transparent), hover/active (signal
orange border or fill), primary (orange fill, graphite text), disabled (40% opacity, no pointer).
Min 44px touch height on mobile.

---

## 9. Build order (this initiative)

1. ✅ **This IA spec** — the blueprint.
2. 🟡 **Premium PlayerProfile** — 3-col desktop command center / stacked-mobile collapsible
   cards + the §6 empty-state system. *(evolves the current 2-col, doesn't discard it)*
3. ⛔ **Verified badge + academic/recruiting rail** — §5 per-metric states + §3.4 academics block
   + the share system polish.

Honesty guardrails carried through all three: no fabricated academics or measurables; verified
vs self-reported always distinct; estimates labeled; empty states honest, not padded.
