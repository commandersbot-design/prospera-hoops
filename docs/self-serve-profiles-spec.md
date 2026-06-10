# Prospera Hoops — Self-Serve Player Profiles (Spec)

_Status: proposal / not built. This is the upgrade from the current "claim request → owner verifies"
form to real player logins + self-editing. Written so you can make the 4–5 decisions at the bottom,
then I build it in phases._

---

## 1. Goal

Make "claim your profile" literally true: a player (or parent/coach) can sign in, prove they're the
person on the card, and **edit their own profile** — bio, contact, film links, measurables, recruiting
status — without you touching anything. You stay the gatekeeper (you approve the claim) and keep total
control of the data integrity layer (stats + eval stay system-owned).

The thing you sell — "a landing base for everything that helps you get recruited, that *they* maintain" —
only becomes real with this. The current form is the honest stopgap; this is the product.

---

## 2. Hard constraints (these shape every decision)

- **Minors.** Most players are under 18. Anything self-serve has to assume a minor is on the other end:
  conservative defaults, parent-claim path, no public contact info unless explicitly opted in, easy takedown.
- **Stats are sacred.** Players must **not** be able to edit PPG/RPG, eval tier, gold tier, game logs,
  or rankings. Those come from your scrapers + your judgment. Self-edit is limited to the "about me" layer.
- **You approve every claim.** No auto-grant. A claim links a login to a player record only after you say yes.
- **Static-site friendly.** The app is a Vite SPA on Vercel with JSON in `public/data/`. The backend has to
  bolt on without rewriting the front end into a server app.
- **Cheap to run at idle.** ~900 players, most never claim. Don't pay for a fleet of always-on servers.

---

## 3. Recommended stack: Supabase

**Supabase** (hosted Postgres + Auth + Storage + Row-Level Security), called directly from the SPA via
`@supabase/supabase-js`. No server of our own to run.

Why this over the alternatives:

| Option | Verdict |
|---|---|
| **Supabase** | ✅ Auth, DB, file storage, and per-row security policies in one free tier. Talks straight to a static SPA. RLS enforces "you can only edit your own row" in the database, not just the UI — exactly the guarantee we need with minors' data. |
| Firebase | Works, but NoSQL model fits our relational data (players ↔ claims ↔ users) worse, and security rules are clunkier to reason about than SQL RLS. |
| Roll our own (Node/Express + Postgres on Render) | Most control, most ops + cost + attack surface. Not worth it at this scale. |
| Clerk/Auth0 + separate DB | Two vendors to wire together for what Supabase does in one. |

Auth method: **email magic-link** (no passwords for teenagers to lose) + optional **Google sign-in**.

---

## 4. Data model

Keep the existing JSON as the **stats/eval source of truth** (scrapers keep writing it). Add a thin
Supabase layer for *identity and the editable overlay only*:

```
users            (managed by Supabase Auth)
  id, email, created_at

claims
  id, user_id → users.id
  player_id        -- matches the id already in prospects.json
  role             -- 'player' | 'parent' | 'coach'
  proof            -- IG handle / link the claimant gave
  status           -- 'pending' | 'approved' | 'rejected'
  created_at, reviewed_at, reviewed_by

profile_overrides     -- the ONLY player-editable data
  player_id  (PK, 1:1 with an approved claim)
  bio                  text
  contact_email        text   (private by default)
  contact_phone        text   (private by default)
  twitter, instagram, hudl   text
  film_links           jsonb  -- [{label, url}]
  height, weight, gpa, grad_year, positions   -- "measurables" they can assert; shown as self-reported
  recruiting_status    text   -- 'open' | 'committed' | ...
  updated_at, updated_by
```

**Read path:** the profile page loads `prospects.json` (stats/eval) as today, then overlays
`profile_overrides` for that player if it exists. Self-reported fields render with a small
"self-reported" tag so they're never confused with your evaluated data.

**RLS policies (the security spine):**
- `claims`: a user can insert their own claim and read their own; only the admin role can update `status`.
- `profile_overrides`: a user can `update` a row **only if** an `approved` claim links their `user_id` to
  that `player_id`. Enforced in the DB — even a hostile client with our public key cannot edit someone else's.

---

## 5. Flows

**Player/parent claims**
1. On a profile → "Claim profile" → sign in (magic link).
2. Submit role + proof. Row lands in `claims` as `pending`. (This replaces today's email/Formspree hop.)

**You approve (admin view — new `/admin`, gated to your user id)**
3. List of pending claims with the proof link and the player they're claiming.
4. Approve → `status='approved'`, creates the empty `profile_overrides` row. Reject → done.
5. You get an email/push on new claims (Supabase webhook → email).

**Player edits**
6. Once approved, their own profile shows an "Edit my profile" mode: bio, film links, contact (with a
   public/private toggle), socials, self-reported measurables, recruiting status.
7. Saves write to `profile_overrides`; RLS guarantees they only touch their own.

**Public sees**
8. Anyone viewing the profile gets stats/eval (yours) + the overlay (theirs), with self-reported fields tagged
   and private contact hidden unless opted public. A "✓ Claimed" badge shows it's player-maintained.

---

## 6. What players can / cannot edit

| Editable by player | System-owned (never editable) |
|---|---|
| Bio / blurb | PPG, RPG, APG, all stats & game logs |
| Film links (YouTube/Hudl/IG) | Eval tier, **gold tier**, rankings |
| Contact info (+ public/private toggle) | Team/school affiliation as derived from stats |
| Socials | Verified badge (you grant it) |
| Self-reported height/weight/GPA/grad year/positions (tagged "self-reported") | Anything the scrapers write |
| Recruiting status | |

This split is the whole trust model: they own the pitch, you own the truth.

---

## 7. Film: links first, uploads later

- **Phase 1:** film = **links** (YouTube/Hudl/IG embeds). Zero storage cost, zero moderation of raw files.
- **Phase 2 (optional):** direct clip upload to Supabase Storage. Adds cost + a moderation duty (you'd want
  to review before public). Recommend deferring until there's demand.

---

## 8. Build phases

1. **Foundation** — Supabase project, Auth (magic link), `claims` table + RLS, swap the current form's submit
   to write a `claims` row. _Outcome: real logins; claims captured in a DB instead of email._
2. **Admin approve** — `/admin` gated to you; approve/reject; new-claim notification. _Outcome: you can grant claims._
3. **Self-edit** — `profile_overrides` + RLS, "Edit my profile" UI, overlay on the public profile, "✓ Claimed"
   badge, self-reported tags. _Outcome: the feature is real and shippable._
4. **Polish** — public/private contact toggle, parent-claim nuances, takedown/unclaim, edit history.
5. **(Optional) Film uploads** — Storage + moderation queue.

Phases 1–3 are the product. 4–5 are follow-ons.

---

## 9. Cost

Supabase **free tier**: 50k monthly active users, 500MB Postgres, 1GB file storage, 5GB bandwidth.
At ~900 players where a small fraction ever log in and film is links-only, **we stay free** for a long time.
First paid tier is **$25/mo** (Pro) — only needed if storage/bandwidth grows (i.e. Phase 5 uploads or heavy
traffic). No per-server idle cost either way.

---

## 10. Risks / things to get right

- **Minors' privacy.** Default all contact info to private; require an explicit opt-in to show publicly;
  honor takedown fast. Consider a parent-claim requirement for under-13 if any exist.
- **Impersonation.** Manual approval + proof is the defense; don't auto-grant. Re-check proof on suspicious claims.
- **Key exposure.** Supabase's anon key is public by design — RLS is what protects data, so the policies must be
  right before launch. I'd write and test them as the first thing.
- **Data drift.** Self-reported height vs. your measured height can disagree — the "self-reported" tag keeps your
  eval credible while still giving them a voice.
- **Abandonment.** Approved-but-never-edited profiles should just fall back to your data cleanly (they do — overlay
  is optional).

---

## 11. Decisions I need from you

1. **Stack** — go with Supabase (recommended), or do you want a different backend?
2. **Sign-in** — magic-link only (simplest for teens), or also Google?
3. **Self-reported measurables** — let players assert height/weight/GPA (tagged), or lock those to your data too?
4. **Contact visibility** — private by default with opt-in to public (recommended), or never show contact publicly?
5. **Scope to start** — build Phases 1–3 (full working feature), or just Phase 1 (logins + DB-backed claims) first?

Answer those and I'll start on Phase 1.
