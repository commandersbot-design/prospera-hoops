# Prospera+ billing — go-live checklist

The code is fully wired; billing activates the moment these are set. Until then the
UI degrades gracefully ("Prospera+ opens at launch") and nothing is charged.

## 1. Stripe dashboard
1. Create a **Product** "Prospera+" with two recurring **prices**:
   - $5.00 / month  → copy the `price_…` id
   - $39.00 / year  → copy the `price_…` id
   And a **Product** "Coach HQ" with two recurring **prices**:
   - $19.00 / month → copy the `price_…` id
   - $149.00 / year → copy the `price_…` id
   **Coach HQ is free for the first year (launch offer).** Give the Coach prices a
   **365-day free trial** (Stripe price → "Add free trial" → 365 days), or attach a
   100%-off-for-12-months coupon at checkout. The card is collected up front and the
   first charge ($19/mo or $149/yr) lands after 12 months. The UI already says
   "FREE your first year · then $19/mo · or $149/yr".
2. Developers → API keys → copy the **Secret key** (`sk_live_…`).
3. Developers → Webhooks → **Add endpoint**:
   - URL: `https://www.prosperahoops.com/api/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`,
     `customer.subscription.deleted`
   - Copy the **Signing secret** (`whsec_…`).

## 2. Vercel env vars (Production + Preview)
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_PLUS_MONTHLY=price_...
STRIPE_PRICE_PLUS_YEARLY=price_...
STRIPE_PRICE_COACH_MONTHLY=price_...
STRIPE_PRICE_COACH_YEARLY=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://ynovrdtedgcqceqhbgzx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role JWT — Supabase → Project Settings → API>
PUBLIC_BASE_URL=https://www.prosperahoops.com
```
The `SUPABASE_SERVICE_ROLE_KEY` is server-only (used by the webhook). Never expose it
to the browser or prefix it with `VITE_`.

## 3. Supabase — entitlements table
Run in the SQL editor:
```sql
create table if not exists public.entitlements (
  stripe_subscription_id text primary key,
  user_id uuid references auth.users(id),
  email text,
  plan text,
  status text,                       -- trialing | active | past_due | canceled
  stripe_customer_id text,
  current_period_end timestamptz,
  updated_at timestamptz default now()
);
alter table public.entitlements enable row level security;

-- A signed-in user can read only their own entitlement (what gates Prospera+ in the UI).
create policy "own entitlement read" on public.entitlements
  for select using (auth.uid() = user_id);
-- Writes happen only from the webhook via the service-role key, which bypasses RLS.
```

## 4. Verify
- `/plus` → Start trial → Stripe Checkout (test mode first with `sk_test_…` + test prices).
- Complete checkout → webhook upserts a row → `hasPlus()` returns true → the
  Development Arc unlocks on any profile while signed in.
- Cancel in Stripe → `customer.subscription.deleted` → status `canceled` → re-locks.

## 5. Supabase — film submissions (user-uploaded film)
Run `docs/sql/film_submissions.sql` in the SQL editor. This creates the
`film_submissions` table (+ RLS) and the `public_film` view the profile reads.
- Free accounts get **one** upload; additional uploads are gated behind Prospera+
  (the Film card routes to `/plus`). The 1-free limit is enforced client-side by
  counting the user's own rows.
- Every upload lands `pending` and is **invisible** until you approve it. Review the
  queue from your **Dashboard** (admin-only "Film awaiting review" card) — Approve
  moves it into `public_film`; Reject hides it.
- Admin = a row in `public.admins` for your user id (same table that powers Coach HQ
  owner access).

## Files
- `api/checkout.js` — creates the Checkout Session (Prospera+ 30-day trial; Coach 365-day).
- `api/stripe-webhook.js` — signature-verifies events, writes entitlements.
- `src/lib/billing.js` — `startCheckout()` + `hasPlus()` / `hasCoach()` client helpers.
- `src/lib/film.js` — film submit / list / approve helpers.
- `src/rebuild/RebuildApp.jsx` — `PlusView`, `CoachLock`, `FilmCard`, Dev-Arc gating, admin film queue.
