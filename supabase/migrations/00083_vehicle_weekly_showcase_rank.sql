-- Owner-only weekly showcase rank for a single vehicle.
-- Keep eligibility and 7-day window in sync with get_weekly_top_builds.

create or replace function public.get_vehicle_weekly_showcase_rank(p_vehicle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $fn_get_vehicle_weekly_showcase_rank$
declare
  v_user uuid := auth.uid();
  v_week_start timestamptz := timezone('utc', now()) - interval '7 days';
  v_rank int;
  v_weekly_likes int;
begin
  if v_user is null or p_vehicle_id is null then
    return null;
  end if;

  if not exists (
    select 1
    from public.vehicles v
    where v.id = p_vehicle_id
      and v.user_id = v_user
  ) then
    return null;
  end if;

  if not exists (
    select 1
    from public.vehicles v
    where v.id = p_vehicle_id
      and v.is_public = true
      and v.showcase_swipe_opt_in = true
      and v.public_slug is not null
      and btrim(v.public_slug) <> ''
  ) then
    return null;
  end if;

  with weekly as (
    select
      s.vehicle_id,
      count(*)::int as weekly_likes
    from public.showcase_swipes s
    inner join public.vehicles v on v.id = s.vehicle_id
    where s.decision = 'like'
      and s.created_at >= v_week_start
      and v.is_public = true
      and v.showcase_swipe_opt_in = true
      and v.public_slug is not null
      and btrim(v.public_slug) <> ''
    group by s.vehicle_id
  ),
  ranked as (
    select
      vehicle_id,
      weekly_likes,
      row_number() over (order by weekly_likes desc, vehicle_id) as rank
    from weekly
  )
  select r.rank, r.weekly_likes
    into v_rank, v_weekly_likes
  from ranked r
  where r.vehicle_id = p_vehicle_id;

  if v_rank is null or v_weekly_likes is null or v_weekly_likes < 1 then
    return null;
  end if;

  return jsonb_build_object(
    'rank', v_rank,
    'weekly_likes', v_weekly_likes
  );
end;
$fn_get_vehicle_weekly_showcase_rank$;

revoke all on function public.get_vehicle_weekly_showcase_rank(uuid) from public;
grant execute on function public.get_vehicle_weekly_showcase_rank(uuid) to authenticated;

comment on function public.get_vehicle_weekly_showcase_rank(uuid) is
  'Returns { rank, weekly_likes } for the owner vehicle in the 7-day swipe leaderboard, or null.';
