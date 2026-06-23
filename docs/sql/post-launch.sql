-- ============================================================================
-- PROSPERA HOOPS — post-launch SQL. Run this WHOLE file once in Supabase →
-- SQL Editor → New query → Run. Fully idempotent: safe to re-run anytime.
-- Activates: unclaim · profile editor + admin approval gate · claimant-email in
-- the review queue · scouts-viewed-you · entitlements (for Stripe later).
-- ============================================================================
create extension if not exists "pgcrypto";

-- 1) UNCLAIM — let a user withdraw their own claim.
drop policy if exists "claims delete own" on public.claims;
create policy "claims delete own" on public.claims for delete to authenticated using (user_id = auth.uid());

-- 2) PROFILE EDITOR overlay + admin approval gate (verify before live).
create table if not exists public.profile_overrides ( player_id text primary key );
alter table public.profile_overrides add column if not exists bio text;
alter table public.profile_overrides add column if not exists film_links jsonb not null default '[]'::jsonb;
alter table public.profile_overrides add column if not exists height text;
alter table public.profile_overrides add column if not exists weight text;
alter table public.profile_overrides add column if not exists wingspan text;
alter table public.profile_overrides add column if not exists gpa text;
alter table public.profile_overrides add column if not exists grad_year int;
alter table public.profile_overrides add column if not exists positions text;
alter table public.profile_overrides add column if not exists recruiting_status text;
alter table public.profile_overrides add column if not exists sat text;
alter table public.profile_overrides add column if not exists act text;
alter table public.profile_overrides add column if not exists ncaa_status text;
alter table public.profile_overrides add column if not exists major text;
alter table public.profile_overrides add column if not exists instagram text;
alter table public.profile_overrides add column if not exists twitter text;
alter table public.profile_overrides add column if not exists hudl text;
alter table public.profile_overrides add column if not exists contact_email text;
alter table public.profile_overrides add column if not exists contact_phone text;
alter table public.profile_overrides add column if not exists contact_public boolean not null default false;
alter table public.profile_overrides add column if not exists published boolean not null default false;
alter table public.profile_overrides add column if not exists player_name text;
alter table public.profile_overrides add column if not exists updated_at timestamptz not null default now();
alter table public.profile_overrides enable row level security;
drop policy if exists "override owner rw" on public.profile_overrides;
create policy "override owner rw" on public.profile_overrides for all to authenticated
  using (exists (select 1 from public.claims c where c.player_id=profile_overrides.player_id and c.user_id=auth.uid() and c.status='approved'))
  with check (exists (select 1 from public.claims c where c.player_id=profile_overrides.player_id and c.user_id=auth.uid() and c.status='approved') and published=false);
drop policy if exists "override admin read" on public.profile_overrides;
create policy "override admin read" on public.profile_overrides for select to authenticated using (exists (select 1 from public.admins a where a.user_id=auth.uid()));
drop policy if exists "override admin update" on public.profile_overrides;
create policy "override admin update" on public.profile_overrides for update to authenticated using (exists (select 1 from public.admins a where a.user_id=auth.uid()));
drop policy if exists "override admin delete" on public.profile_overrides;
create policy "override admin delete" on public.profile_overrides for delete to authenticated using (exists (select 1 from public.admins a where a.user_id=auth.uid()));
drop view if exists public.public_profiles;
create view public.public_profiles as
  select player_id, bio, film_links, height, weight, wingspan, gpa, grad_year, positions,
    recruiting_status, sat, act, ncaa_status, major, instagram, twitter, hudl,
    case when contact_public then contact_email else null end as contact_email,
    case when contact_public then contact_phone else null end as contact_phone,
    contact_public, updated_at
  from public.profile_overrides where published = true;
grant select on public.public_profiles to anon, authenticated;

-- 3) CLAIMANT EMAIL in the admin review queue (joins auth.users; admin-only).
create or replace function public.admin_pending_claims()
returns table (id uuid, player_id text, player_name text, school text, role text, proof text, message text, status text, created_at timestamptz, claimant_email text)
language sql security definer set search_path = public as $$
  select c.id, c.player_id, c.player_name, c.school, c.role, c.proof, c.message, c.status, c.created_at, u.email::text
  from public.claims c left join auth.users u on u.id=c.user_id
  where c.status='pending' and exists (select 1 from public.admins a where a.user_id=auth.uid())
  order by c.created_at desc;
$$;
grant execute on function public.admin_pending_claims() to authenticated;

-- 4) SCOUTS VIEWED YOU — distinct coach/scout views per player.
create table if not exists public.profile_views (
  id uuid primary key default gen_random_uuid(),
  player_id text not null,
  viewer_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.profile_views enable row level security;
drop policy if exists "pv insert own" on public.profile_views;
create policy "pv insert own" on public.profile_views for insert to authenticated with check (viewer_id = auth.uid());
create or replace view public.profile_scout_counts as
  select player_id, count(distinct viewer_id)::int as scouts, max(created_at) as last_viewed
  from public.profile_views group by player_id;
grant select on public.profile_scout_counts to anon, authenticated;

-- 5) ENTITLEMENTS — for Stripe / Prospera+ (parked until you wire Stripe).
create table if not exists public.entitlements (
  stripe_subscription_id text primary key, user_id uuid references auth.users(id),
  email text, plan text, status text, stripe_customer_id text,
  current_period_end timestamptz, updated_at timestamptz default now()
);
alter table public.entitlements enable row level security;
drop policy if exists "own entitlement read" on public.entitlements;
create policy "own entitlement read" on public.entitlements for select using (auth.uid() = user_id);
