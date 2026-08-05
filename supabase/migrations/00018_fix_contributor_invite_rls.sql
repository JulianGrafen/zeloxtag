-- =============================================================================
-- ZeloxTag · Fix over-broad Schrauber invite accept RLS
-- Migration: 00018_fix_contributor_invite_rls
-- =============================================================================
-- CRITICAL: vehicle_contributors_update_self_accept allowed any authenticated
-- user to UPDATE any pending invite (user_id IS NULL) to active for themselves
-- without presenting the invite token. Accept must go through the app action
-- (service role + token verification) only.
-- =============================================================================

drop policy if exists "vehicle_contributors_update_self_accept"
  on public.vehicle_contributors;
