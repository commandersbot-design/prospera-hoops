# Coach Outreach + Intake Playbook

Copy-paste scripts to sign a coach to a **free pilot**, plus the exact data ask and the
intake sheet. Lead with what they already want — **stat tracking + a recruiting home base
for their players** — not "an app." The pitch is: *you keep playing, we turn your box scores
into player profiles, leaderboards, recaps, and a team page — free.*

Pilots already lined up: **Hayfield** (HS, live) · **Washington Warriors 3SSB** + **AKT** (AAU, rosters pending).

---

## 0. The one thing that gates everything: data completeness

The depth of what we can build is a direct function of what the coach can hand over. Set the
floor at **T1** (a normal box score) — that already powers the entire product. Never promise
above the tier their data supports.

| Tier | What they have | What they get |
|---|---|---|
| **T0** | Final scores only | Record, schedule, results, team page |
| **T1** ← *aim here* | Box score per game (PTS/REB/AST/STL/BLK/TO + FG/3P/FT + MIN) | **Everything**: player cards, PPG/RPG/APG, eFG%/TS%, archetypes, DMV percentiles, development, leaderboard, recaps, Scout HQ |
| **T2** | + shot charts / play-by-play | Unlocks true pace, lineup efficiency, on/off (the 🔒 cards) |
| **T3** | + measured combine + film tags | Verified measurables, shot-type, defender H2H |

Most programs sit at T1 (a scorekeeper or MaxPreps export). That's the target.

---

## 1. Warm AAU coach (you know them) — text / DM

> Coach — I built **Prospera Hoops**, a DMV scouting platform. I'm running a few **free pilots**
> and want **[Program]** to be one of the AAU programs on it.
>
> What you get, no cost: every kid gets a real **player profile** (stats, role, development over
> time) + a **shareable recruiting card** they can post, plus a **team page**, **leaderboards**,
> and auto **game recaps**. It's a recruiting tool for your guys and a stats record for you.
>
> All I need to start: **do you keep box scores at your events?** If you've got them in any
> form — a sheet, MaxPreps, even a scorekeeper's notebook — I can take it from there. I'll send
> a simple template to drop the numbers into. Want me to set up **[Program]**?

## 2. Warm HS coach — text / DM

> Coach — quick one. I built **Prospera Hoops** (DMV basketball scouting/stats). I'd love to put
> **[School]** on it as a **free pilot** — same setup I'm running with another DMV program.
>
> Your players each get a pro-looking **profile + recruiting page** (stats, measurables,
> academics, film) they can share with college coaches, and you get a **team page**, **stat
> leaders**, and **recaps** — all maintained for you.
>
> Only thing I need: **your game box scores** (season so far + going forward). I'll hand you a
> one-page template; you or your stats kid fill it in and send it back. Good to roll?

## 3. Cold / referred — email

> **Subject: Free stat + recruiting profiles for [Program]'s players**
>
> Coach [Name] — [referrer] pointed me your way. I run **Prospera Hoops**, a DMV-focused
> basketball scouting platform, and I'm onboarding a small set of programs **free** this season.
>
> For **[Program]** that means: a profile for every player (stats, role, development, film,
> academics), shareable recruiting cards, a team page, leaderboards, and automatic game recaps —
> built and maintained by us. It's a recruiting asset for your players and a clean stats record
> for your staff.
>
> To stand a program up I just need your **box scores** in whatever form you keep them. I'll send
> a simple template and do the rest. Open to a 10-minute call, or I can just send the template?
>
> — [You] · prospera-preps.vercel.app

## 4. Follow-up nudge (3–4 days later)

> Coach — circling back on getting **[Program]** set up on Prospera (free). Easiest first step:
> reply "send it" and I'll drop over the one-page stat template. No commitment — if you don't
> love it once you see your team's page, no hard feelings.

---

## 5. The data ask — what "box scores" means

Send this only if they ask what you need exactly:

> Per game I need one line per player who played:
> **points, rebounds (off/def if you have it), assists, steals, blocks, turnovers, and shooting
> — FG made/attempted, 3PT made/attempted, FT made/attempted, and minutes.**
> Plus each player's **height, weight, grad year**. If you've also got shot charts or
> play-by-play, even better — but the box score is all I need to start.

---

## 6. The intake sheet

**Primary: the Excel workbook** (branded, with dropdowns, comments, and a consent notice).
Generate it per program:

```bash
python scripts/gen-intake-template.py --team hayfield          # prefilled from existing roster
python scripts/gen-intake-template.py --new "Washington Warriors 3SSB 17U"   # blank roster for a new program
# → docs/<Program>-Intake-Template.xlsx
```

Four tabs, columns are the exact tokens `scripts/ingest.mjs` reads (so it ingests with zero
cleanup):

- **Start Here** — instructions + the consent paragraph (parents/guardians consent to name,
  stats, profile, and any provided photos/film; minors' social handles stay private).
- **Roster** — `team · number · player · pos · grad_year · height · weight · offers · commit · film_link · instagram`
- **Schedule** — `game_id · date · event · opponent · home_away · team_pts · opp_pts`
- **Box Score** — `game_id · date · player · min · fgm · fga · tpm · tpa · ftm · fta · oreb · dreb · ast · stl · blk · tov · pf · started · (dfl · chg optional)`

The coach fills the yellow cells (heights/weights + one schedule row and one box-score row per
player per game), sends it back, and `node scripts/ingest.mjs --level <HS|AAU|Summer> --circuit <name> --season <yr>`
turns it into cards, recaps, leaderboard, and the team page.

### Lite version (for a coach who won't open a spreadsheet)
Paste this into the DM/email and let them fill it in plain text — you transcribe into the workbook:

```
ROSTER (one line each):
#  | Name           | Pos | Grad | Ht   | Wt
12 | Marcus Allen   | PG  | 2027 | 6'1" | 175
...

PER GAME — date + opponent, then one line per player:
Game: 11/22 vs Gonzaga (W 64-58)
Name         | MIN | PTS | REB | AST | STL | BLK | TO | FG   | 3PT | FT
Marcus Allen | 28  | 18  | 4   | 6   | 2   | 0   | 3  | 7-12 | 2-5 | 2-2
...
```

---

## 7. What to send them back (the close)

Within a day of getting data, send the live links — this is what converts the pilot into a
referral engine:
- their **team page** (`/team/<slug>`) with record, leaders, schedule,
- **2–3 player cards** (the shareable recruiting images) for their best players,
- one **auto recap** from a recent game.

Then: *"Share these with your players — they can post the cards. Want me to add the rest of your
games?"* Players posting their own cards is the distribution loop; coaches refer other coaches
once they see their program's page.

---

## 8. Honesty guardrails (keep the trust intact)
- Stats are **split by context** — HS weighs most, summer league is flagged lighter (exhibition).
  Don't let a coach think summer numbers are being passed off as varsity production.
- Measurables are **self-reported until a Prospera-verified source exists** — say so.
- **No fabricated academics or ranks.** GPA/test/NCAA show only when the player provides them.
- **Minors' privacy:** social handles are stripped from public data; consent is captured in the
  workbook before anything goes live.
