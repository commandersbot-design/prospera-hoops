# Prospera Hoops — Launch Runbook

Target: **Thu 2026-06-18**. The rebuild lives on branch `rebuild` (pushed to origin).
Production (`main`) currently serves the OLD app behind the pre-launch holding page.

---

## 0. Pre-merge review (do tonight)
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
- Add Vercel env vars: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PLUS_MONTHLY/YEARLY`, `STRIPE_PRICE_COACH_MONTHLY/YEARLY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_BASE_URL`.
- Create the Supabase `entitlements` table (SQL in `docs/STRIPE_SETUP.md`) so `hasPlus()`/`hasCoach()` can read it.
- Until set: checkout shows "Prospera+ opens at launch" and nothing is charged.

## 4. Rollback
- If the live rebuild has a problem: set `VITE_PRELAUNCH=true` + redeploy (back to holding page in minutes), or revert the merge commit on `main`.

---

## Known gaps vs the old production app (fast-follow, not blockers)
Peripheral surfaces the old app had that the rebuild does not yet:
- **DMV Map** (ProspectMap / Leaflet) — geocoded school map.
- **News ticker** (src/data/news.json) — "Live Wire".
- **Recaps feed** (public/data/gameRecaps.json).
- **Leaders** standings view (Coach HQ has league leaders; no public Leaders page).
- **Classes** browse-by-grad-year (Prospects has a Class filter that covers most of this).
- **Commitments** tracker (data currently shows ~0 commitments).
- **Profile Film** wiring (src/data/prospectFilm.json) — currently a placeholder.
- **HS-season stats** (src/data/teamStats.json) — the profile "High school" context tab.
- **Richer recruiting-rankings** card (stars/national·state·position + service links) for the ~21 ranked players.
- **Profile editor / claimed-overlay / admin-claims** UI (claim works; in-app editing does not yet).

Recommended order to close post-launch: Recaps + News ticker (engagement) → Leaders + Classes (cheap) → Film + HS-season stats + recruiting card (profile depth) → Map → Profile editor.
