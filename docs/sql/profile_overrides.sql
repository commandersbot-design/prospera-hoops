-- ============================================================================
-- PROSPERA HOOPS — profile self-edit (the in-app profile editor).
-- Paste this WHOLE file into Supabase → SQL Editor → New query → Run.
-- Fully idempotent: safe to run repeatedly AND repairs a profile_overrides table
-- that an earlier schema created without all columns. Requires the `claims` table.
--
-- This is the ONLY player-editable data: bio, film, self-reported measurables,
-- academics, recruiting status, socials, contact. Stats / rankings / evaluation
-- stay system-owned. RLS guarantees a user can edit ONLY the player they hold an
-- APPROVED claim for.
-- ============================================================================

create table if not exists public.profile_overrides ( player_id text primary key );

-- Ensure every column exists even if the table predates this version.
alter table public.profile_overrides add column if not exists bio              text;
alter table public.profile_overrides add column if not exists film_links       jsonb not null default '[]'::jsonb;
alter table public.profile_overrides add column if not exists height           text;
alter table public.profile_overrides add column if not exists weight           text;
alter table public.profile_overrides add column if not exists wingspan         text;
alter table public.profile_overrides add column if not exists gpa              text;
alter table public.profile_overrides add column if not exists grad_year        int;
alter table public.profile_overrides add column if not exists positions        text;
alter table public.profile_overrides add column if not exists recruiting_status text;
alter table public.profile_overrides add column if not exists sat              text;
alter table public.profile_overrides add column if not exists act              text;
alter table public.profile_overrides add column if not exists ncaa_status      text;
alter table public.profile_overrides add column if not exists major            text;
alter table public.profile_overrides add column if not exists instagram        text;
alter table public.profile_overrides add column if not exists twitter          text;
alter table public.profile_overrides add column if not exists hudl             text;
alter table public.profile_overrides add column if not exists contact_email    text;
alter table public.profile_overrides add column if not exists contact_phone    text;
alter table public.profile_overrides add column if not exists contact_public   boolean not null default false;
alter table public.profile_overrides add column if not exists updated_at       timestamptz not null default now();

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

-- Public read view — contact masked to null unless contact_public.
drop view if exists public.public_profiles;
create view public.public_profiles as
  select player_id, bio, film_links, height, weight, wingspan, gpa, grad_year,
         positions, recruiting_status, sat, act, ncaa_status, major,
         instagram, twitter, hudl,
         case when contact_public then contact_email else null end as contact_email,
         case when contact_public then contact_phone else null end as contact_phone,
         contact_public, updated_at
  from public.profile_overrides;
grant select on public.public_profiles to anon, authenticated;
