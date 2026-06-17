# Prospera+ billing — go-live checklist

The code is fully wired; billing activates the moment these are set. Until then the
UI degrades gracefully ("Prospera+ opens at launch") and nothing is charged.

## 1. Stripe dashboard
1. Create a **Product** "Prospera+" with two recurring **prices**:
   - $5.00 / month  → copy the `price_…` id
   - $39.00 / year  → copy the `price_…` id
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

## Files
- `api/checkout.js` — creates the Checkout Session (30-day trial).
- `api/stripe-webhook.js` — signature-verifies events, writes entitlements.
- `src/lib/billing.js` — `startCheckout()` + `hasPlus()` client helpers.
- `src/rebuild/RebuildApp.jsx` — `PlusView`, Dev-Arc gating on `hasPlus()`.
