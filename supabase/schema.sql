-- Prospera Hoops — self-serve profiles schema + Row-Level Security.
-- Paste this whole file into Supabase → SQL Editor → Run. Safe to re-run.
--
-- Three tables:
--   admins             — who can review claims (you add yourself, see step at bottom)
--   claims             — a user claiming they are/represent a player; you approve
--   profile_overrides  — the ONLY player-editable data (overlay on top of your JSON)
--
-- RLS is the real security boundary: the browser only ever holds the public
-- "anon" key, so every rule below is enforced by Postgres, not the UI.

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so policies can check membership without
-- recursing through the tables' own RLS).
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
  returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.owns_player(p_id text)
  returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.claims
    where user_id = auth.uid() and player_id = p_id and status = 'approved'
  );
$$;

-- ---------------------------------------------------------------------------
-- claims
-- ---------------------------------------------------------------------------
create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  player_id text not null,
  player_name text,
  school text,
  role text not null default 'Player',
  proof text,
  message text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (user_id, player_id)
);

alter table public.claims enable row level security;

drop policy if exists claims_insert_own on public.claims;
create policy claims_insert_own on public.claims
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

drop policy if exists claims_select_own_or_admin on public.claims;
create policy claims_select_own_or_admin on public.claims
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Only admins change status (approve/reject). Owners cannot self-approve.
drop policy if exists claims_update_admin on public.claims;
create policy claims_update_admin on public.claims
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- profile_overrides — player-editable overlay
-- ---------------------------------------------------------------------------
create table if not exists public.profile_overrides (
  player_id text primary key,
  bio text,
  contact_email text,
  contact_phone text,
  contact_public boolean not null default false,
  instagram text,
  twitter text,
  hudl text,
  height text,
  weight text,
  gpa text,
  grad_year int,
  positions text,
  recruiting_status text,
  sat text,
  act text,
  ncaa_status text,
  major text,
  film_links jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

-- Additive columns (so re-running on an existing DB picks up new academic fields,
-- which `create table if not exists` above would otherwise skip).
alter table public.profile_overrides add column if not exists sat text;
alter table public.profile_overrides add column if not exists act text;
alter table public.profile_overrides add column if not exists ncaa_status text;
alter table public.profile_overrides add column if not exists major text;

alter table public.profile_overrides enable row level security;

-- Base-table reads are restricted to the owner + admins. The PUBLIC reads the
-- masked view below instead (so private contact never leaks).
drop policy if exists overrides_select_owner on public.profile_overrides;
create policy overrides_select_owner on public.profile_overrides
  for select to authenticated
  using (public.owns_player(player_id) or public.is_admin());

drop policy if exists overrides_insert_owner on public.profile_overrides;
create policy overrides_insert_owner on public.profile_overrides
  for insert to authenticated
  with check (public.owns_player(player_id));

drop policy if exists overrides_update_owner on public.profile_overrides;
create policy overrides_update_owner on public.profile_overrides
  for update to authenticated
  using (public.owns_player(player_id))
  with check (public.owns_player(player_id));

-- Public, contact-masked view. Runs with the view owner's rights (bypasses the
-- base RLS) and exposes contact only when the player opted in.
drop view if exists public.public_profiles;
create view public.public_profiles as
  select
    player_id, bio, instagram, twitter, hudl,
    height, weight, gpa, grad_year, positions, recruiting_status,
    sat, act, ncaa_status, major,
    film_links, contact_public,
    case when contact_public then contact_email else null end as contact_email,
    case when contact_public then contact_phone else null end as contact_phone,
    updated_at
  from public.profile_overrides;

grant select on public.public_profiles to anon, authenticated;

-- admins: a user may read only their own row (used by the app to learn "am I an
-- admin?"). Inserts/updates happen here in the SQL editor, never via the API.
alter table public.admins enable row level security;
drop policy if exists admins_select_self on public.admins;
create policy admins_select_self on public.admins
  for select to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- MAKE YOURSELF AN ADMIN
-- After you sign in to the app once (so your auth user exists), run:
--
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'YOUR_EMAIL_HERE'
--   on conflict do nothing;
--
-- ---------------------------------------------------------------------------
