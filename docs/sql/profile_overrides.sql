-- ============================================================================
-- PROSPERA HOOPS — profile self-edit (the in-app profile editor).
-- Paste this WHOLE file into Supabase → SQL Editor → New query → Run.
-- Idempotent (safe to run more than once). Requires the `claims` table to exist.
--
-- This is the ONLY player-editable data: bio, film, self-reported measurables,
-- academics, recruiting status, socials, contact. Stats / rankings / evaluation
-- stay system-owned. RLS guarantees a user can edit ONLY the player they hold an
-- APPROVED claim for.
-- ============================================================================

create table if not exists public.profile_overrides (
  player_id        text primary key,
  bio              text,
  film_links       jsonb not null default '[]'::jsonb,
  height           text,
  weight           text,
  wingspan         text,
  gpa              text,
  grad_year        int,
  positions        text,
  recruiting_status text,
  sat              text,
  act              text,
  ncaa_status      text,
  major            text,
  instagram        text,
  twitter          text,
  hudl             text,
  contact_email    text,
  contact_phone    text,
  contact_public   boolean not null default false,
  updated_at       timestamptz not null default now()
);

alter table public.profile_overrides enable row level security;

-- Owner = holds an APPROVED claim for this player_id. Full read/write on their row.
drop policy if exists "override owner rw" on public.profile_overrides;
create policy "override owner rw" on public.profile_overrides for all to authenticated
  using (exists (select 1 from public.claims c
                 where c.player_id = profile_overrides.player_id
                   and c.user_id = auth.uid() and c.status = 'approved'))
  with check (exists (select 1 from public.claims c
                      where c.player_id = profile_overrides.player_id
                        and c.user_id = auth.uid() and c.status = 'approved'));

-- Public read view — everyone can see the overlay, but contact details are
-- masked to null unless the owner flipped contact_public on.
create or replace view public.public_profiles as
  select player_id, bio, film_links, height, weight, wingspan, gpa, grad_year,
         positions, recruiting_status, sat, act, ncaa_status, major,
         instagram, twitter, hudl,
         case when contact_public then contact_email else null end as contact_email,
         case when contact_public then contact_phone else null end as contact_phone,
         contact_public, updated_at
  from public.profile_overrides;
grant select on public.public_profiles to anon, authenticated;
