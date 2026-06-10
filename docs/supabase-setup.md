# Turning on self-serve profiles (≈10 minutes)

The code is already built. Until you do these steps the app keeps working and the
"Claim profile" button falls back to the email form — nothing breaks. Once the two
env values are set, claims/sign-in/self-edit go live.

## 1. Create a free Supabase project
1. Go to **https://supabase.com** → sign up → **New project**.
2. Name it `prospera-hoops`, pick a region near the DMV (e.g. East US), set a database
   password (save it somewhere), create.
3. Wait ~2 min for it to provision.

## 2. Create the tables + security rules
1. In the project, open **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this repo, copy the whole file, paste, **Run**.
   You should see "Success". (Safe to re-run anytime.)

## 3. Turn on email magic-link sign-in
1. **Authentication → Providers → Email**: make sure **Email** is enabled.
   (Magic link works out of the box; you can leave "Confirm email" on.)
2. **Authentication → URL Configuration → Site URL**: set it to your site,
   e.g. `https://prospera-preps.vercel.app` (and add `http://localhost:5173`
   under "Redirect URLs" if you want to test locally).

## 4. Give the app your keys
1. **Project Settings → API**. Copy **Project URL** and the **anon public** key.
2. **Local:** copy `.env.example` to `.env.local` and paste both values:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   ```
3. **Production (Vercel):** Project → **Settings → Environment Variables** → add the
   same two (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) for Production + Preview →
   **redeploy**.

## 5. Make yourself the admin
1. Open the live site, click **Sign in**, enter your email, click the link it sends
   (this creates your auth user).
2. Back in Supabase **SQL Editor**, run (use the email you just signed in with):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'YOU@EXAMPLE.COM'
   on conflict do nothing;
   ```
3. Reload the site — you'll now see a **Claims** button in the header.

## How it works after that
- A player/parent opens their profile → **Claim profile** → signs in → submits a claim.
- You get the claim under **Claims** → **Approve**.
- They then see **Edit my profile** on their page and can add bio, film links, contact
  (private by default), socials, and self-reported height/GPA/class.
- Stats, rankings, and the gold/eval tiers stay yours — players can't touch them.

## Costs
Free tier covers this comfortably at your scale (film stored as links, not uploads).
You'd only hit the $25/mo tier with heavy traffic or if we later add direct video uploads.

See `docs/self-serve-profiles-spec.md` for the full design and the optional Phase 4–5
follow-ons (parent-claim nuances, takedown, video uploads).
