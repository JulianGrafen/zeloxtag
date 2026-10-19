-- Owner-facing daily swipe stats (calendar day Europe/Berlin).

create or replace function public.get_vehicle_showcase_swipe_daily_stats(p_vehicle_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $fn_get_vehicle_showcase_swipe_daily_stats$
declare
  v_user uuid := auth.uid();
  v_day_start timestamptz;
  v_vehicle_id uuid;
  v_swipe_count int;
  v_like_count int;
  v_like_rate int;
begin
  if v_user is null then
    return null;
  end if;

  v_day_start :=
    (date_trunc('day', now() AT TIME ZONE 'Europe/Berlin') AT TIME ZONE 'Europe/Berlin');

  if p_vehicle_id is not null then
    if not exists (
      select 1
      from public.vehicles v
      where v.id = p_vehicle_id
        and v.user_id = v_user
        and v.is_public = true
        and v.showcase_swipe_opt_in = true
        and v.public_slug is not null
        and btrim(v.public_slug) <> ''
    ) then
      return null;
    end if;

    v_vehicle_id := p_vehicle_id;
  else
    select s.vehicle_id
      into v_vehicle_id
    from public.showcase_swipes s
    inner join public.vehicles v on v.id = s.vehicle_id
    where v.user_id = v_user
      and v.is_public = true
      and v.showcase_swipe_opt_in = true
      and v.public_slug is not null
      and btrim(v.public_slug) <> ''
      and s.created_at >= v_day_start
    group by s.vehicle_id
    order by count(*) desc, s.vehicle_id
    limit 1;

    if v_vehicle_id is null then
      return null;
    end if;
  end if;

  select
    count(*)::int,
    count(*) filter (where s.decision = 'like')::int
    into v_swipe_count, v_like_count
  from public.showcase_swipes s
  where s.vehicle_id = v_vehicle_id
    and s.created_at >= v_day_start;

  if v_swipe_count is null or v_swipe_count < 1 then
    return null;
  end if;

  v_like_rate := round(v_like_count * 100.0 / v_swipe_count)::int;

  return jsonb_build_object(
    'vehicle_id', v_vehicle_id,
    'swipe_count', v_swipe_count,
    'like_rate_percent', v_like_rate
  );
end;
$fn_get_vehicle_showcase_swipe_daily_stats$;

revoke all on function public.get_vehicle_showcase_swipe_daily_stats(uuid) from public;
grant execute on function public.get_vehicle_showcase_swipe_daily_stats(uuid) to authenticated;

comment on function public.get_vehicle_showcase_swipe_daily_stats(uuid) is
  'Returns { vehicle_id, swipe_count, like_rate_percent } for today (Europe/Berlin), or null. Omit vehicle id for owner highlight vehicle.';
