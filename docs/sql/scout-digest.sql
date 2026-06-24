-- ============================================================================
-- PROSPERA HOOPS — "scouts viewed you" daily digest data source.
-- Run once in Supabase → SQL Editor. Service-role-only (the cron uses the
-- service_role key); NOT exposed to normal users, so no email/view-count leak.
-- ============================================================================

-- Per claimed player viewed by a coach/scout in the last 24h: owner email + count.
create or replace function public.scout_digest_due()
returns table (player_id text, player_name text, owner_email text, scouts_today int)
language sql security definer set search_path = public as $$
  select v.player_id,
         max(c.player_name)            as player_name,
         u.email::text                 as owner_email,
         count(distinct v.viewer_id)::int as scouts_today
  from public.profile_views v
  join public.claims c   on c.player_id = v.player_id and c.status = 'approved'
  join auth.users u      on u.id = c.user_id
  where v.created_at >= now() - interval '24 hours'
  group by v.player_id, u.email
  having count(distinct v.viewer_id) > 0;
$$;

revoke execute on function public.scout_digest_due() from public, anon, authenticated;
grant execute on function public.scout_digest_due() to service_role;
