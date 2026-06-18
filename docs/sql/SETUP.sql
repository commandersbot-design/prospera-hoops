-- ============================================================================
-- PROSPERA HOOPS — one-shot Supabase setup. Paste this WHOLE file into the
-- Supabase SQL editor (Dashboard → SQL → New query → Run). Idempotent: safe to
-- run more than once. This is what makes sign-up / lock-in / add-yourself /
-- film / billing actually work end to end.
--
-- AFTER running: sign in once on the live site, then come back here and run the
-- INSERT at the very bottom with your own user id to make yourself an admin.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- admins ----
create table if not exists public.admins ( user_id uuid primary key references auth.users(id) on delete cascade );
alter table public.admins enable row level security;
drop policy if exists "admin read own" on public.admins;
create policy "admin read own" on public.admins for select to authenticated using (user_id = auth.uid());

-- --------------------------------------------------- waitlist / lock-in ----
create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  name        text,
  role        text,
  player_id   text,
  player_name text,
  kind        text not null default 'lockin',  -- 'lockin' | 'add_player'
  school      text,
  grad_year   int,
  position    text,
  note        text,
  status      text not null default 'pending',
  created_at  timestamptz not null default now()
);
alter table public.waitlist add column if not exists kind text not null default 'lockin';
alter table public.waitlist add column if not exists school text;
alter table public.waitlist add column if not exists grad_year int;
alter table public.waitlist add column if not exists position text;
alter table public.waitlist add column if not exists note text;
alter table public.waitlist add column if not exists status text not null default 'pending';
alter table public.waitlist enable row level security;
drop policy if exists "waitlist join" on public.waitlist;
create policy "waitlist join" on public.waitlist for insert to anon, authenticated with check (true);
drop policy if exists "waitlist admin read" on public.waitlist;
create policy "waitlist admin read" on public.waitlist for select to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- ----------------------------------------------------- film submissions ----
create table if not exists public.film_submissions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  player_id   text not null,
  player_name text,
  url         text not null,
  title       text,
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.film_submissions enable row level security;
drop policy if exists "film insert own" on public.film_submissions;
create policy "film insert own" on public.film_submissions for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "film read own" on public.film_submissions;
create policy "film read own" on public.film_submissions for select to authenticated using (user_id = auth.uid());
drop policy if exists "film admin read" on public.film_submissions;
create policy "film admin read" on public.film_submissions for select to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));
drop policy if exists "film admin update" on public.film_submissions;
create policy "film admin update" on public.film_submissions for update to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));
create or replace view public.public_film as
  select id, player_id, player_name, url, title, created_at from public.film_submissions where status = 'approved';
grant select on public.public_film to anon, authenticated;

-- ------------------------------------------------- claims (profile claim) ---
create table if not exists public.claims (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  player_id   text not null,
  player_name text,
  school      text,
  role        text,
  proof       text,
  message     text,
  status      text not null default 'pending',
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.claims enable row level security;
drop policy if exists "claims insert own" on public.claims;
create policy "claims insert own" on public.claims for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "claims read own" on public.claims;
create policy "claims read own" on public.claims for select to authenticated using (user_id = auth.uid());
drop policy if exists "claims admin read" on public.claims;
create policy "claims admin read" on public.claims for select to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));
drop policy if exists "claims admin update" on public.claims;
create policy "claims admin update" on public.claims for update to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- --------------------------------------------- entitlements (Stripe, opt) ---
create table if not exists public.entitlements (
  stripe_subscription_id text primary key,
  user_id uuid references auth.users(id),
  email text, plan text, status text,
  stripe_customer_id text, current_period_end timestamptz,
  updated_at timestamptz default now()
);
alter table public.entitlements enable row level security;
drop policy if exists "own entitlement read" on public.entitlements;
create policy "own entitlement read" on public.entitlements for select using (auth.uid() = user_id);

-- ------------------------------------- profile views ("scouts viewed you") --
-- A row is written when a coach-tier (scout) account opens a player's profile.
create table if not exists public.profile_views (
  id         uuid primary key default gen_random_uuid(),
  player_id  text not null,
  viewer_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.profile_views enable row level security;
drop policy if exists "pv insert own" on public.profile_views;
create policy "pv insert own" on public.profile_views for insert to authenticated with check (viewer_id = auth.uid());
-- Public aggregate so a profile can show how many distinct scouts viewed it.
create or replace view public.profile_scout_counts as
  select player_id, count(distinct viewer_id)::int as scouts, max(created_at) as last_viewed
  from public.profile_views group by player_id;
grant select on public.profile_scout_counts to anon, authenticated;

-- ============================================================================
-- MAKE YOURSELF ADMIN — sign in on the site once, then Dashboard → Auth →
-- Users → copy your UUID and run:
--   insert into public.admins (user_id) values ('PASTE-YOUR-UUID') on conflict do nothing;
-- ============================================================================
