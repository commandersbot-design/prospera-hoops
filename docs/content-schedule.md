# PROSPERA HOOPS — CONTENT SCHEDULE & LAUNCH RUNBOOK

Drop date: **Thursday, June 18, 2026.** Today: Mon June 15. Templates referenced by
file name from `prospera-template-pack.zip` (preserved in `brand-kit/template-pack/`).
Auto-fillable versions render via `node scripts/gen-posts.mjs` → `docs/social-posts/`.
Post times are ET (DMV audience).

> **Two rules on every post:** (1) swap all sample data for **real, current, consented**
> numbers — a made-up stat kills the credibility that is the whole brand; (2) keep the
> **handle + URL** visible (they're in the footer) so every repost points home.

---

## 0. READINESS GATE — clear before Thursday (non-negotiable)
If any of these is false Thursday morning, **slip the date** rather than launch broken.
- [ ] Site live at prosperahoops.com, loads fast, **mobile-clean**
- [ ] Email verified (finish the Vercel TXT record) so contact/claim works
- [ ] The launch link works and lands somewhere real
- [ ] **Real current data visible** — Hayfield + the 60-team summer ticker is your proof
- [ ] At least 3–5 consented player photos in hand for Spotlight/Commitment posts
- [ ] Profiles look right on a phone (most traffic arrives via a DM link)

---

## 1. LAUNCH RUNWAY

### MON 6/15 — "Something's coming" (brand reveal)
- **Post (6:30 PM):** `01_teaser` → IG feed + X + TikTok.
  Caption: *"The DMV is getting its scouting system of record. Every summer-league
  player. Real stats, real development. 06.18. ⛹️ #DMVHoops"*
- **IG Story:** same image + the **Countdown sticker** set to Thursday.
- Goal: intrigue + the date. No product yet.

### TUE 6/16 — "Here's what it does" (value tease)
- **Midday (12:30 PM):** `04_statdrop` (a real, consented player).
  Caption: *"This is one summer-league line. Thursday, every DMV player has one.
  ProsperaHoops.com → 06.18"*
- **Evening (6:30 PM):** `03_spotlight` (real player).
  Caption: *"Names first — not rankings. Real stats, tracked over time. This is what
  drops Thursday for the whole DMV. #DMVBasketball #CapitolHoops"*
- **IG Story:** "2 days" countdown.

### WED 6/17 — "Tomorrow" (urgency + first look)
- **Midday (12:30 PM):** `05_top5` — **frame as a stat leaderboard**, not a subjective
  ranking. Caption: *"DMV summer scoring leaders. The full board drops tomorrow.
  Who'd you add? ⬇️"*
- **Evening (6:30 PM):** **10-sec screen-recording** of the live site scrolling on a
  phone → Reel/TikTok. Caption: *"Tomorrow. The DMV's numbers, in one place.
  ProsperaHoops.com"*
- **IG Story:** "1 day" countdown.

---

## 2. LAUNCH DAY — THU 6/18 (three posts)

### Morning anchor (9:30 AM) — `02_live`
Caption: *"WE'RE LIVE. 60+ summer teams. 900+ DMV players. Every stat, one place —
free. Find your player → ProsperaHoops.com"*
→ **Pin this post** on IG + X. Cross-post to all platforms.

### Midday flagship (12:30 PM) — `05_top5` or `14_context`
Caption: *"The DMV summer-league scoring board is live — and every number is
measured against the whole field, not one team. Explore → ProsperaHoops.com"*

### Evening conversion (6:30 PM) — `16_claim` (+ a `06_recap` if a game played)
Caption: *"Is this you? Every DMV summer-league player has a profile. Claim yours —
add your photo, film, and contact. ProsperaHoops.com"*
- **X:** a short thread — what Prospera is, why the DMV needed it, what's next.
- **TikTok:** a 30–60s walkthrough of the live site.

---

## 3. SUSTAIN — don't go quiet (the launch's most common failure)
Week one proves you exist; **week two proves you're current** — that's the moat.
Roll straight into the loop:

### Same-day / event-driven (highest priority)
- **`06_recap`** within hours of any game — final + top performer. This is what proves
  freshness; nothing matters more.
- **`08_matchup`** the morning/afternoon of a notable game.

### Weekly recurring cadence
| Day | Post | Template |
|-----|------|----------|
| Mon | Riser of the week | `10_riser` |
| Tue | Player spotlight | `03_spotlight` |
| Wed | In Context (percentiles) or Head to Head | `14_context` / `13_h2h` |
| Thu | Stat drop | `04_statdrop` |
| Fri | The Leap (development) | `09_leap` |
| Sat | Game recaps (as games happen) | `06_recap` |
| Sun | This Week in the DMV (digest) | `12_thisweek` |

### Situational (fire when the moment hits)
- **`07_commit`** — any commitment (huge reach; player + school reshare).
- **`15_team`** — feature a program; tag the coach → opens the program-services door.
- **`13_h2h` / `16_poll`** — engagement/debate days when you want comments.
- **`11_scoutnote`** — your editorial voice; sprinkle in for authority.
- **`15_milestone`** — career highs, big games.

---

## 4. POSTING PRINCIPLES
- **Timing:** evenings (6–8 PM) and game nights; the only morning post is the launch
  anchor. Sundays for the digest.
- **Consent:** every player photo/feature needs consent — especially launch-week posts
  going to a bigger audience. Solve it at intake.
- **The rankings line:** leaderboards = stat-based (fine). Never sell or imply a
  subjective ranking — that contradicts the honest-eval moat.
- **Hashtags (DMV-local):** #DMVHoops #DMVBasketball #CapitolHoops #DMVScouting
  + school/team tags + tag the player/program so they reshare.
- **Cross-post smart:** IG feed (4:5), X (same image), TikTok/Reels for the
  screen-record and walkthroughs. Always lead people back to ProsperaHoops.com.
- **Engagement:** reply to every comment in the first hour of a post — it compounds reach.

---

## 5. ONE-LINE DAILY CHECKLIST (launch week)
- [ ] MON — Teaser + Story countdown
- [ ] TUE — Stat Drop (midday) + Spotlight (eve) + "2 days" Story
- [ ] WED — Leaderboard (midday) + site screen-record Reel (eve) + "1 day" Story
- [ ] THU — WE'RE LIVE (AM, pin) + Flagship (midday) + Claim CTA (eve) + X thread + TikTok
- [ ] FRI+ — Recaps same-day, then the weekly cadence above.

---

## Build status (what's auto-generated vs. still needed)
`scripts/gen-posts.mjs` already auto-fills from real data: **01_teaser, 02_live, 03_spotlight,
04_statdrop, 05_top5, 16_claim.** → covers the entire launch runway + launch day.

Still to build for the sustain cadence (§3): **06_recap, 08_matchup, 09_leap, 10_riser,
11_scoutnote, 12_thisweek, 13_h2h, 14_context, 07_commit, 15_team/milestone, 16_poll.**

Note (date): the drop is **June 18**; the live site's launch shifted from Wed→Thu per this runbook.
