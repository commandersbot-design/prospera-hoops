# Prospera Hoops — Launch Runbook

Target: **Thu 2026-06-18 · 5:00 PM EST.**
**STATUS:** the rebuild is **merged to `main` and deployed** to prosperahoops.com — currently
**gated** (public sees the holding page). Verified live. The site goes public the moment you
flip one env var.

---

## ⭐ GO-LIVE CHECKLIST (the only things left)

**1. Supabase — run the SQL (one paste).** Dashboard → SQL Editor → New query → paste all of
`docs/sql/SETUP.sql` → Run. This creates every table sign-up needs: admins, waitlist,
film_submissions, claims, entitlements, profile_views. **Without this, lock-in / add-yourself /
scout-views / claims all fail.** (Idempotent — safe to re-run.)

**2. Supabase — Auth URL config.** Authentication → URL Configuration → Site URL
`https://prosperahoops.com`; add redirect URLs `https://prosperahoops.com/**` and
`https://www.prosperahoops.com/**`. (Makes magic-link sign-in work.)

**3. Make yourself admin.** Sign in once on the live site (via `?preview=courtside`), then
Authentication → Users → copy your UUID → run the `insert into public.admins …` line at the
bottom of `SETUP.sql`. (Unlocks the film + "players to verify" + waitlist queues on your Dashboard.)

**4. Final human test** on the real domain: `https://prosperahoops.com/?preview=courtside`
(see §0 below for what to click).

**5. 🔴 GO LIVE:** Vercel → Settings → Environment Variables → set `VITE_PRELAUNCH=false`
(Production) → **Redeploy**. Public now. Post the launch graphics at 5pm (`PROSPERALAUNCHKIT`).

**Rollback:** set `VITE_PRELAUNCH=true` → redeploy (holding page back in ~1 min).

**Post-launch (fast-follow):** flip `COACH_HQ_OPEN = false` in RebuildApp.jsx once accounts/Stripe
are set, to re-gate Coach HQ behind the Coach tier · wire Stripe (`docs/STRIPE_SETUP.md`) · build
the MaxPreps roster scraper to fill non-summer school rosters.

---

## 0. Pre-merge review (now a human-test checklist)
- Open the **Vercel preview** for the `rebuild` branch (Vercel dashboard → Deployments → `rebuild`).
- Unlock it: append `?preview=courtside` to the preview URL once per device (it's a prod build, so it's gated like live).
- Walk every view: Landing · a few Profiles · Prospects filters · Teams + Schedule · Coach HQ (redeem owner code `PROSPERA-OWNER-CF2E1B`).
- **Verify real auth**: click "Log in" → enter your email → confirm the magic-link email arrives and signs you in.
- One pass on a real phone (hamburger nav, no sideways scroll).

## 1. Merge (tomorrow AM, once happy)
```
git checkout main
git merge rebuild          # or merge the PR on GitHub
git push origin main
```
`main` is still gated (holding page) in production after this — safe. Confirm the production
deploy succeeds and STILL shows the holding page (gate is ON by default in prod).

## 2. Go live (the single switch)
- Vercel → Project → Settings → **Environment Variables** → set `VITE_PRELAUNCH=false` (Production).
- **Redeploy** Production. The rebuild is now public at prosperahoops.com.
- Sanity-check live: landing loads, a profile deep-link works (`/p/<player>`), OG preview renders when shared.

## 3. Billing (optional at launch — can fast-follow)
Free tiers work without this (claim, profiles, Coach HQ via pilot codes). To enable paid:
- Follow `docs/STRIPE_SETUP.md`: create Prospera+ ($5/mo · $39/yr) and Coach HQ ($19/mo · $149/yr) prices.
- **Coach HQ is free for the first year** — give the Coach prices a 365-day free trial (or a 12-month 100%-off coupon). UI already reads "FREE your first year · then $19/mo · $149/yr".
- Add Vercel env vars: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PLUS_MONTHLY/YEARLY`, `STRIPE_PRICE_COACH_MONTHLY/YEARLY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_BASE_URL`.
- Create the Supabase `entitlements` table (SQL in `docs/STRIPE_SETUP.md`) so `hasPlus()`/`hasCoach()` can read it.
- Until set: checkout shows "opens at launch" and nothing is charged.

## 3a. Waitlist "lock in" (the day-one signup path — run the SQL)
The primary launch CTA is **"Lock in your free account"** — a frictionless email capture with **no magic-link round-trip**, so signups can't be blocked by email deliverability. Real sign-in links go out later as you open accounts.
- Run `docs/sql/waitlist.sql` in Supabase (one table, anon-insert + admin-read). **Do this before launch** — without it, the lock-in button shows a "try again" error.
- See who locked in from your **Dashboard** (admin-only "Locked in · N" card).
- Magic-link **sign-in still works** as the secondary path (header "Log in", and "Sign in to claim now" on profiles) — but nothing on the critical first-glance flow depends on an email arriving.

## 3b. Film uploads (run the SQL to turn it on)
- Run `docs/sql/film_submissions.sql` in Supabase. Until then the Film card just shows "Add film — sign in"; submitting will no-op with a friendly retry message.
- Free accounts get **1 upload**; more is gated behind Prospera+. Every upload is `pending` until you approve it from the **Dashboard** (admin-only "Film awaiting review" card).
- Make sure your user id has a row in `public.admins` so the review queue appears for you.

## 4. Rollback
- If the live rebuild has a problem: set `VITE_PRELAUNCH=true` + redeploy (back to holding page in minutes), or revert the merge commit on `main`.

---

## Closed before launch (parity)
- ✅ **HS-season stats** — profile "High school" tab populates from teamStats.json.
- ✅ **News ticker** ("Live Wire") on the landing — news.json + auto top performances.
- ✅ **Leaders** — public leaderboards at /leaders.
- ✅ **Recaps** — /recaps, 46 Capitol Hoops previews/recaps, credited (links to source).
- ✅ **Recruiting card** — on the profile (commitment/offers/rankings when present, else claim-to-add).
- ✅ **Classes / Commitments** — covered by the Prospects Class filter + Recruiting card status.

## Known gaps vs the old production app (fast-follow, not blockers)
- **DMV Map** (ProspectMap / Leaflet) — geocoded school map.
- **Profile editor / admin-claims** UI (claim works; in-app editing does not yet).

Recommended order to close post-launch: Map → Profile editor.

## Closed this round
- ✅ **Film** — user-submitted, paywalled (1 free upload, then Prospera+), admin-approved before publish (`docs/sql/film_submissions.sql`).
- ✅ **Coach HQ free first year** — UI offer wired; configure the Stripe 365-day trial at billing setup.
- ✅ **Official school names + full rosters** across Teams/Coach HQ; no-stat rostered players in the database.
