-- Calendar swipe-like weeks (Mon 00:00 – next Mon 00:00 Europe/Berlin).
-- Counts reset each Monday; cron awards use the completed week window.

create or replace function public.showcase_swipe_weekly_window_start()
returns timestamptz
language sql
stable
as $$
  select (
    date_trunc('week', now() AT TIME ZONE 'Europe/Berlin')
  ) AT TIME ZONE 'Europe/Berlin';
$$;

create or replace function public.showcase_swipe_weekly_window_end()
returns timestamptz
language sql
stable
as $$
  select (
    date_trunc('week', now() AT TIME ZONE 'Europe/Berlin') + interval '7 days'
  ) AT TIME ZONE 'Europe/Berlin';
$$;

create or replace function public.showcase_swipe_weekly_previous_window_start()
returns timestamptz
language sql
stable
as $$
  select (
    date_trunc('week', now() AT TIME ZONE 'Europe/Berlin') - interval '7 days'
  ) AT TIME ZONE 'Europe/Berlin';
$$;

create or replace function public.showcase_swipe_weekly_previous_window_end()
returns timestamptz
language sql
stable
as $$
  select public.showcase_swipe_weekly_window_start();
$$;

comment on function public.showcase_swipe_weekly_window_start() is
  'Start of the current calendar swipe week (Monday 00:00 Europe/Berlin).';
comment on function public.showcase_swipe_weekly_window_end() is
  'Exclusive end of the current calendar swipe week (next Monday 00:00 Europe/Berlin).';

drop function if exists public.get_weekly_top_builds(int);

create function public.get_weekly_top_builds(p_limit int default 10)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $fn_get_weekly_top_builds$
declare
  v_user uuid := auth.uid();
  v_limit int := least(greatest(coalesce(p_limit, 10), 1), 10);
  v_start timestamptz := public.showcase_swipe_weekly_window_start();
  v_end timestamptz := public.showcase_swipe_weekly_window_end();
  v_rows jsonb;
begin
  if v_user is null then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(row_data order by (row_data->>'rank')::int), '[]'::jsonb)
    into v_rows
  from (
    select jsonb_build_object(
      'rank', ranked.rank,
      'vehicle_id', v.id,
      'public_slug', v.public_slug,
      'make', v.make,
      'model', v.model,
      'year', v.year,
      'weekly_likes', ranked.weekly_likes,
      'has_silhouette', (v.silhouette_image_url is not null and btrim(v.silhouette_image_url) <> ''),
      'silhouette_image_url', v.silhouette_image_url,
      'updated_at', v.updated_at
    ) as row_data
    from (
      select
        w.vehicle_id,
        w.weekly_likes,
        row_number() over (order by w.weekly_likes desc, w.vehicle_id) as rank
      from (
        select
          s.vehicle_id,
          count(*)::int as weekly_likes
        from (
          select sw.vehicle_id, sw.decision, sw.created_at
          from public.showcase_swipes sw
          union all
          select aw.vehicle_id, aw.decision, aw.created_at
          from public.anonymous_showcase_swipes aw
        ) s
        inner join public.vehicles v on v.id = s.vehicle_id
        where s.decision = 'like'
          and s.created_at >= v_start
          and s.created_at < v_end
          and v.is_public = true
          and v.showcase_swipe_opt_in = true
          and v.public_slug is not null
          and btrim(v.public_slug) <> ''
        group by s.vehicle_id
        having count(*) >= 1
      ) w
      order by w.weekly_likes desc, w.vehicle_id
      limit v_limit
    ) ranked
    inner join public.vehicles v on v.id = ranked.vehicle_id
  ) sub;

  return v_rows;
end;
$fn_get_weekly_top_builds$;

revoke all on function public.get_weekly_top_builds(int) from public;
grant execute on function public.get_weekly_top_builds(int) to authenticated;

drop function if exists public.service_weekly_top_builds(int);

create function public.service_weekly_top_builds(
  p_limit int default 10,
  p_use_completed_week boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $fn_service_weekly_top_builds$
declare
  v_limit int := least(greatest(coalesce(p_limit, 10), 1), 10);
  v_start timestamptz;
  v_end timestamptz;
  v_rows jsonb;
begin
  if p_use_completed_week then
    v_start := public.showcase_swipe_weekly_previous_window_start();
    v_end := public.showcase_swipe_weekly_previous_window_end();
  else
    v_start := public.showcase_swipe_weekly_window_start();
    v_end := public.showcase_swipe_weekly_window_end();
  end if;

  select coalesce(
    jsonb_agg(row_data order by (row_data->>'weekly_likes')::int desc, row_data->>'vehicle_id'),
    '[]'::jsonb
  )
    into v_rows
  from (
    select jsonb_build_object(
      'vehicle_id', w.vehicle_id,
      'weekly_likes', w.weekly_likes
    ) as row_data
    from (
      select
        s.vehicle_id,
        count(*)::int as weekly_likes
      from (
        select sw.vehicle_id, sw.decision, sw.created_at
        from public.showcase_swipes sw
        union all
        select aw.vehicle_id, aw.decision, aw.created_at
        from public.anonymous_showcase_swipes aw
      ) s
      inner join public.vehicles v on v.id = s.vehicle_id
      where s.decision = 'like'
        and s.created_at >= v_start
        and s.created_at < v_end
        and v.is_public = true
        and v.showcase_swipe_opt_in = true
        and v.public_slug is not null
        and btrim(v.public_slug) <> ''
      group by s.vehicle_id
      having count(*) >= 1
      order by count(*) desc, s.vehicle_id
      limit v_limit
    ) w
  ) sub;

  return v_rows;
end;
$fn_service_weekly_top_builds$;

revoke all on function public.service_weekly_top_builds(int, boolean) from public;
grant execute on function public.service_weekly_top_builds(int, boolean) to service_role;

create or replace function public.get_vehicle_weekly_showcase_rank(p_vehicle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $fn_get_vehicle_weekly_showcase_rank$
declare
  v_user uuid := auth.uid();
  v_start timestamptz := public.showcase_swipe_weekly_window_start();
  v_end timestamptz := public.showcase_swipe_weekly_window_end();
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
    from (
      select sw.vehicle_id, sw.decision, sw.created_at
      from public.showcase_swipes sw
      union all
      select aw.vehicle_id, aw.decision, aw.created_at
      from public.anonymous_showcase_swipes aw
    ) s
    inner join public.vehicles v on v.id = s.vehicle_id
    where s.decision = 'like'
      and s.created_at >= v_start
      and s.created_at < v_end
      and v.is_public = true
      and v.showcase_swipe_opt_in = true
      and v.public_slug is not null
      and btrim(v.public_slug) <> ''
    group by s.vehicle_id
    having count(*) >= 1
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
