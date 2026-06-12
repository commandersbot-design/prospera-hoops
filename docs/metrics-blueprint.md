# Prospera Hoops — Stats & Metrics Blueprint (v1)

The decided spec for what the platform tracks, computes, and shows. Everything here
is **box-score-derivable and honest** unless explicitly labeled an estimate. This is
the source of truth for the player page, the ingest schema, and the cards.

## Guardrails (non-negotiable)
- **No fabricated precision.** Real numbers, real cohort percentiles. No opaque
  "overall rating" until there's a defensible baseline.
- **Cohort percentiles are real or labeled projected** — never faked.
- **Estimates are labeled** (e.g., usage). **Self-reported vs Verified** measurables
  are visually distinct.
- **Sample gating:** rate/percentile/trajectory features require a minimum games
  played (default **MIN_GP = 3**); below that we show raw lines + "building baseline."

---

## 1. Input schema (what we collect)

### Per-game box score — CORE (required)
`game_id, date, player, min, fgm, fga, tpm, tpa, ftm, fta, oreb, dreb, ast, stl, blk, tov, pf`
- **`min` is now required** — it unlocks per-36 and load metrics. The workbook flags it.
- Derived, never entered: `pts = 2*fgm + tpm + ftm`, `reb = oreb + dreb`.

### Per-game — OPTIONAL extras (surfaced as "tracked extras" when present)
`started` (1/0), `dfl` (deflections), `chg` (charges drawn)
- Teams that keep a richer book get more on their page; teams that don't aren't blocked.

### Game context
`opponent, event, home_away, result` (+ optional `opp_tier` for opponent-adjusted splits later)

### Player measurables (self-reported via profile claim; verified via event)
`height, weight, wingspan, standing_reach, vertical_max, vertical_standing,`
`verified (bool), measured_at, measured_date, source`

### Bio / recruiting
`positions, grad_year, hs, aau, hometown, gpa (optional), film_links[], offers[], commitment, contact (gated)`

---

## 2. Player statistics (v1 = "rich but honest")

### Basic (per game + totals)
PTS, REB (O/D), AST, STL, BLK, TOV, PF, MIN, GP, GS

### Shooting & scoring profile
- FG / 3P / FT makes-attempts-percent
- **eFG%** = (FGM + 0.5·TPM) / FGA
- **TS%** = PTS / (2·(FGA + 0.44·FTA))
- **3PA-rate** = TPA / FGA, **FT-rate** = FTA / FGA
- **Scoring mix** = share of points from 2s / 3s / FTs

### Efficiency & role
- **Per-36 lines** (PTS/REB/AST/etc. × 36 / MIN) — normalizes minutes; labeled "per-36".
  Assumes extrapolation to 36; shown only when minutes exist.
- **AST:TO** ratio, **TOV%** = TOV / (FGA + 0.44·FTA + TOV)
- **Usage (est.)** = (FGA + 0.44·FTA + TOV) per-minute share — **labeled estimate**
- **Stocks** = STL + BLK

### Trend & consistency
- **Last-3 vs season** (hot/cold delta on PTS + TS%)
- Floor/ceiling: season high/low, median, count of 20+ pt games (and double-doubles)

### Splits (when context tags exist)
home/away, W/L, by event, vs `opp_tier` — phase 2 (needs opponent tagging)

---

## 3. Context & percentiles (the differentiator)
- **DMV cohort percentiles**, GP-gated, computed against our real player pool:
  - Cohort = players at the **same competition level** (summer-league pool ≈ 800+; HS pool separate).
  - Refine by **grad year** when that sub-cohort is large enough; otherwise level-wide,
    and any class-relative read is labeled **projected**.
  - Reported per category: Scoring, Efficiency (TS%), Playmaking (AST + AST:TO),
    Rebounding, Stocks, Perimeter shot (3P% + volume).
- **Opponent-adjusted** context — phase 2 once `opp_tier` is captured.

---

## 4. Signature layer (decided: archetype + trajectory; no composite rating)

### Archetype tag (descriptive, calibrated on the real cohort)
A short role label from the statistical profile + position. Thresholds are **percentile-based
within the cohort** (data-driven, not arbitrary), and the label is descriptive — never a ranking.

Taxonomy (v1):
| Archetype | Rough signature |
|---|---|
| Primary Shot Creator | elite scorer + creator (high usage, scores and passes) |
| Lead Playmaker | high assists / pass-first floor general |
| Primary Scorer | high-volume scorer, scoring-first |
| Sharpshooter | high-volume, accurate 3-pt threat (featured shooting load) |
| Floor Spacer | low-usage complementary shooter / spacer |
| 3&D Wing | perimeter shooting + defensive activity |
| Two-Way Wing | scores + above-cohort stocks |
| Slasher / Foul-Drawer | gets to the line, low 3PA |
| Stretch Big | big who spaces the floor |
| Rebounding Big | interior rebounder, offensive glass |
| Glass Cleaner | elite rebounding rate |
| Defensive Anchor | rim protection (blocks/stocks) |
| Low-Usage Glue | efficient, low-usage role player |
| Rotation Contributor | balanced role (fallback) |

Shown with a one-line "why" (the two or three stats that earned it) for transparency.

#### LOCKED classifier (v1 — calibrated 2026-06-12 on the 697-player cohort)
Thresholds are **percentile ranks within the live cohort** (self-calibrating). Rules are
checked in order; first match wins. `P(x)` = player's cohort percentile in metric x.
Reproduce/re-tune any time with `node scripts/calibrate-archetypes.mjs`.

1. **Lead Playmaker (pass-first)** — `P(ast) ≥ .90 AND P(ast) > P(pts)`
2. **Primary Shot Creator** — `P(pts) ≥ .85 AND P(ast) ≥ .78 AND P(usage) ≥ .80`
3. **Lead Playmaker** — `P(ast) ≥ .82 AND P(ast:to) ≥ .55`
4. **Primary Scorer** — `P(pts) ≥ .80 AND P(usage) ≥ .75`
5. **Sharpshooter** — `P(3PA-rate) ≥ .70 AND P(3P%) ≥ .65 AND P(usage) ≥ .55`
6. **3&D Wing** — `perimeter AND P(3PA-rate) ≥ .60 AND P(3P%) ≥ .45 AND P(stocks) ≥ .60`
7. **Stretch Big** — `big AND P(3PA-rate) ≥ .55`
8. **Defensive Anchor** — `big AND P(bpg) ≥ .85`
9. **Rebounding Big** — `big AND P(rpg) ≥ .70 AND P(oreb-share) ≥ .50 AND P(3PA-rate) < .45`
10. **Glass Cleaner** — `P(rpg) ≥ .85`
11. **Slasher / Foul-Drawer** — `P(ft-rate) ≥ .80 AND P(3PA-rate) < .45 AND P(pts) ≥ .50`
12. **Floor Spacer** — `P(3PA-rate) ≥ .80 AND P(3P%) ≥ .50 AND P(usage) < .55`
13. **Two-Way Wing** — `perimeter AND P(pts) ≥ .55 AND P(stocks) ≥ .62`
14. **Low-Usage Glue** — `P(usage) ≤ .40 AND (P(ast:to) ≥ .50 OR P(ts%) ≥ .55)`
15. **(no tag)** — `P(pts) ≤ .25 AND P(usage) ≤ .30` (limited role — never a negative label)
16. **Rotation Contributor** — fallback

Notes: `usage` = per-game `(FGA + 0.44·FTA + TOV)` proxy (labeled estimate). `P(3P%)` is only
computed for players with ≥5 total 3PA (else shooter rules don't qualify). Position buckets:
Guard / Wing / Big (mapped from the roster `pos`).

**Shooter honesty:** box scores can't see *how* a three was created (catch-and-shoot vs. off
movement/screens). So **Sharpshooter vs. Floor Spacer is split by shooting VOLUME/role (usage) —
which is measurable — never by shot mechanics.** Sharpshooter = a featured, high-usage shooting
threat; Floor Spacer = a low-usage complementary spacer. A true "movement shooter" distinction
would require an observed source (scout/coach tag or assisted-% from play-by-play) and is on the
roadmap as a **tagged, observed-not-derived** attribute (same posture as Verified measurables).

**Small-sample flag:** when `GP < 5`, show the tag with an "early read · N GP" qualifier so a
hot 3-game start (e.g. a 20-ppg line) reads as provisional, not established.

Cohort distribution at lock (697 players): Rotation Contributor 19% · Low-Usage Glue 18% ·
Lead Playmaker 13% · no-tag 9% · Primary Scorer 8% · Primary Shot Creator 5% · Floor Spacer 4% ·
Defensive Anchor 4% · Stretch Big 4% · Two-Way Wing 4% · Sharpshooter 3% · Glass Cleaner 3% ·
Rebounding Big 2% · Slasher 2% · 3&D Wing 1%.

### Trajectory arrow (GP-gated, efficiency-first)
Compares season N vs N-1 on **TS% (efficiency), role (usage/minutes), and per-36 production**,
each season GP-gated. Public framing (kid-facing, still honest):
- **↗ Rising** — improved efficiency at equal/greater load
- **→ Holding** — steady
- **◌ Building baseline** — not enough multi-season sample yet

(We don't publish a "declining" badge on minors' pages; we simply show the numbers.)

---

## 5. Measurables (self-reported now, Verified later)
- Self-reported entered via the player's claimed profile; rendered with a **"self-reported"** tag.
- **"Prospera Verified"** badge for anything measured at a Prospera event (combine/measurement day) —
  a credibility moat and a marketable event. Track **growth over time** (e.g., "+2\" since last summer").

---

## 6. Records & milestones (auto-content)
- Player: season highs (pts/reb/ast/3pm), career highs (across seasons), double-doubles, 30-pt games.
- Team: single-game and season records, current leaders.
- DMV: leaderboards by class and by level; milestone flags (e.g., 1000 career pts).
- Each milestone is a card/recap trigger → free, recurring content.

---

## 7. v1 player page (top → bottom)
1. **Identity + measurables** (positions, grad year, HS/AAU, height/weight — tagged self-reported/verified)
2. **Archetype tag** + trajectory arrow
3. **Season averages** (basic + TS%/eFG%)
4. **Per-36 + AST:TO + scoring mix**
5. **DMV percentile bars** (GP-gated)
6. **Game log** (sortable, with the optional extras when tracked)
7. **Trajectory / development** (multi-season)
8. **Film + offers + contact** (gated)

---

## 8. What box scores can't prove (stated plainly on the product)
Defense beyond stocks, shot location/rim pressure, assisted%, on/off & lineup impact, pace,
and **shot-creation context** (catch-and-shoot vs. off-screen/off-the-dribble) — which is why
shooter archetypes are split by volume/role, not mechanics, and a true shot-type tag waits on a
scout/coach-tagged (observed-not-derived) input.
We don't fake these. The optional `dfl`/`chg`/`started` inputs add a little defensive/role color
for teams that track them; deeper defensive data waits for a richer capture method.
