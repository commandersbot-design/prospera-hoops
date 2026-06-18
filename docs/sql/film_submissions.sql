-- Film submissions: user-uploaded film links, admin-gated before they go live.
-- Run once in the Supabase SQL editor. Mirrors the `claims` table pattern.
--
-- Flow: a signed-in user inserts a row (status='pending'). It is invisible to
-- the public until an admin flips status to 'approved', at which point it shows
-- up in the `public_film` view that the profile page reads. Free accounts get
-- ONE upload (enforced in the app via the count of the user's own rows); more
-- requires Prospera+.

create extension if not exists "pgcrypto";

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

-- A user may insert film for themselves and read back their own submissions.
drop policy if exists "film insert own" on public.film_submissions;
create policy "film insert own" on public.film_submissions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "film read own" on public.film_submissions;
create policy "film read own" on public.film_submissions
  for select to authenticated using (user_id = auth.uid());

-- Admins (a row in public.admins) can read and review everything.
drop policy if exists "film admin read" on public.film_submissions;
create policy "film admin read" on public.film_submissions
  for select to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists "film admin update" on public.film_submissions;
create policy "film admin update" on public.film_submissions
  for update to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- Public, read-only view exposing ONLY approved film. The view is owned by the
-- table owner and runs with definer rights, so it bypasses RLS and returns the
-- approved rows to anonymous visitors (the underlying table stays locked down).
create or replace view public.public_film as
  select id, player_id, player_name, url, title, created_at
  from public.film_submissions
  where status = 'approved';

grant select on public.public_film to anon, authenticated;
