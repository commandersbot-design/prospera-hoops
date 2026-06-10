# Turn on "claim your profile" — plain-English walkthrough

This is the one-time setup that makes the **claim your profile** feature go live on
Prospera Hoops. It takes about 10 minutes and costs nothing. Until you do it, the
site works fine — the button just falls back to an email form.

You can follow this yourself, or paste it to Claude and say *"walk me through this."*

---

## What you're turning on
Right now players can't actually log in and edit their own page — it's the honest
"send us an email" version. This setup adds the real thing:

- A player (or their parent/coach) **signs in** and **claims** their profile.
- **You approve** the claim from a "Claims" button that appears in your header.
- Once approved, they can **edit their own page** — bio, film links, contact info,
  socials, and self-reported height/GPA/class.
- **You keep total control of the real data** — stats, rankings, evaluation, and the
  gold tier can never be touched by players. They only edit the "about me" layer.

---

## What you need
- The email you want to use as the **owner/admin** (you).
- Your Vercel account (where the site is already deployed).
- ~10 minutes.

---

## Step 1 — Make a free Supabase project
1. Go to **https://supabase.com** and sign up (Google/GitHub login is fine).
2. Click **New project**.
3. Name it `prospera-hoops`, pick a region near you (e.g. **East US**), set a database
   password (save it somewhere safe), and create it.
4. Wait ~2 minutes for it to finish setting up.

> Supabase is the free service that stores logins and the player-edited info. Think of
> it as the "accounts + database" the site was missing.

## Step 2 — Create the tables and security rules
1. In your new project, click **SQL Editor** (left sidebar) → **New query**.
2. In the code, open the file `supabase/schema.sql` and copy **everything** in it.
3. Paste it into the SQL editor and click **Run**. You should see **Success**.

> This builds the three tables and — importantly — the security rules that guarantee a
> player can only ever edit *their own* approved profile, enforced by the database itself.

## Step 3 — Turn on email sign-in
1. Go to **Authentication → Providers → Email** and make sure **Email** is **on**.
2. Go to **Authentication → URL Configuration**:
   - Set **Site URL** to your live site: `https://prospera-preps.vercel.app`
   - (Optional, for testing on your computer) add `http://localhost:5176` under
     **Redirect URLs**.

> "Magic link" means players sign in by clicking a link emailed to them — no passwords.

## Step 4 — Give the site your two keys
1. Go to **Project Settings → API**. You'll see a **Project URL** and an **anon public** key.
2. In Vercel, open your project → **Settings → Environment Variables**, and add two:
   - `VITE_SUPABASE_URL` → paste the Project URL
   - `VITE_SUPABASE_ANON_KEY` → paste the anon public key
   - Apply them to **Production** (and **Preview** if offered).
3. **Redeploy** the site (Vercel → Deployments → ⋯ → Redeploy).

> Both keys are safe to put in the website — the "anon" key is public by design, and the
> security rules from Step 2 are what actually protect the data.

## Step 5 — Make yourself the admin
1. Open your live site, click **Sign in** (top right), enter your email, and click the
   link Supabase emails you. (This creates your account.)
2. Back in Supabase → **SQL Editor** → **New query**, paste this — replacing the email
   with the exact one you just used — and **Run**:

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'YOUR_EMAIL_HERE'
   on conflict do nothing;
   ```
3. Reload the site. You'll now see a **Claims** button in the header. That's your
   approval inbox.

---

## You're done — here's the day-to-day
- When a player claims a profile, it shows up under **Claims** → you click **Approve**.
- They then get an **Edit my profile** button on their page and can fill it in.
- You never enter anyone's info by hand — they do it; you just say yes.

If anything looks off, paste this whole file back to Claude with what you're seeing and
it can debug it with you. The full technical design (and optional future add-ons like
video uploads) is in `docs/self-serve-profiles-spec.md`.
