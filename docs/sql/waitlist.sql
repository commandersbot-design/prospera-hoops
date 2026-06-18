-- Waitlist / "lock in your account" — frictionless email capture for launch.
-- No magic-link round-trip at the moment of signup: a visitor drops their email
-- (optionally tied to the player profile they're claiming) and is instantly
-- "locked in". You email real sign-in links later as accounts roll out.
-- Run once in the Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  name        text,
  role        text,            -- player | parent | coach | fan
  player_id   text,            -- set when locking in a specific profile
  player_name text,
  created_at  timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- Anyone (even logged-out visitors) can join the waitlist.
drop policy if exists "waitlist join" on public.waitlist;
create policy "waitlist join" on public.waitlist
  for insert to anon, authenticated with check (true);

-- Only admins can read the list.
drop policy if exists "waitlist admin read" on public.waitlist;
create policy "waitlist admin read" on public.waitlist
  for select to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));
