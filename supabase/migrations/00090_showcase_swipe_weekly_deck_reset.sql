-- Re-show builds in swipe decks each calendar week (Mon 00:00 Europe/Berlin).
-- One vote per user/session per vehicle per week; new week = deck eligible again.
--
-- Authenticated deck (showcase_swipes): needs migration 00067+.
-- Public /swipe (anonymous_showcase_swipes): needs 00088_public_swipe_cards.sql first;
-- the anonymous block below is skipped with a NOTICE until 00088 is applied.

create or replace function public.showcase_swipe_calendar_week_date(
  p_at timestamptz default now()
)
returns date
language sql
stable
as $$
  select (date_trunc('week', p_at AT TIME ZONE 'Europe/Berlin'))::date;
$$;

comment on function public.showcase_swipe_calendar_week_date(timestamptz) is
  'Monday date (Berlin) of the calendar swipe week containing p_at.';

-- Authenticated swipes -------------------------------------------------------

alter table public.showcase_swipes
  add column if not exists calendar_week_start date;

update public.showcase_swipes
set calendar_week_start = public.showcase_swipe_calendar_week_date(created_at)
where calendar_week_start is null;

alter table public.showcase_swipes
  alter column calendar_week_start set not null;

alter table public.showcase_swipes
  alter column calendar_week_start
  set default public.showcase_swipe_calendar_week_date();

alter table public.showcase_swipes
  drop constraint if exists showcase_swipes_unique_pair;

alter table public.showcase_swipes
  drop constraint if exists showcase_swipes_unique_user_vehicle_week;

alter table public.showcase_swipes
  add constraint showcase_swipes_unique_user_vehicle_week
  unique (swiper_user_id, vehicle_id, calendar_week_start);

create index if not exists showcase_swipes_swiper_week_idx
  on public.showcase_swipes (swiper_user_id, calendar_week_start);

-- Anonymous swipes (00088) ---------------------------------------------------

do $anonymous_weekly_reset$
begin
  if to_regclass('public.anonymous_showcase_swipes') is null then
    raise notice
      '00090: skip anonymous weekly reset — apply 00088_public_swipe_cards.sql first';
    return;
  end if;

  alter table public.anonymous_showcase_swipes
    add column if not exists calendar_week_start date;

  update public.anonymous_showcase_swipes
  set calendar_week_start = public.showcase_swipe_calendar_week_date(created_at)
  where calendar_week_start is null;

  alter table public.anonymous_showcase_swipes
    alter column calendar_week_start set not null;

  alter table public.anonymous_showcase_swipes
    alter column calendar_week_start
    set default public.showcase_swipe_calendar_week_date();

  alter table public.anonymous_showcase_swipes
    drop constraint if exists anonymous_showcase_swipes_unique_session_vehicle;

  alter table public.anonymous_showcase_swipes
    drop constraint if exists anonymous_showcase_swipes_unique_session_vehicle_week;

  alter table public.anonymous_showcase_swipes
    add constraint anonymous_showcase_swipes_unique_session_vehicle_week
    unique (client_session_hash, vehicle_id, calendar_week_start);

  create index if not exists anonymous_showcase_swipes_session_week_idx
    on public.anonymous_showcase_swipes (client_session_hash, calendar_week_start);
end;
$anonymous_weekly_reset$;

-- Authenticated deck: hide only current-week swipes --------------------------

drop function if exists public.list_showcase_swipe_candidates(int);

create function public.list_showcase_swipe_candidates(p_limit int default 15)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $fn_list_showcase_swipe_candidates$
declare
  v_user uuid := auth.uid();
  v_limit int := least(greatest(coalesce(p_limit, 15), 1), 30);
  v_week date := public.showcase_swipe_calendar_week_date();
  v_rows jsonb;
begin
  if v_user is null then
    return '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(row_data order by row_data->>'sort_key'),
    '[]'::jsonb
  )
    into v_rows
  from (
    select jsonb_build_object(
      'vehicle_id', v.id,
      'public_slug', v.public_slug,
      'make', v.make,
      'model', v.model,
      'year', v.year,
      'power_ps', nullif(v.tech_specs->>'powerPs', '')::numeric,
      'torque_nm', nullif(v.tech_specs->>'torqueNm', '')::numeric,
      'accel_0_100_sec', nullif(v.tech_specs->>'accel0To100Sec', '')::numeric,
      'accel_100_200_sec', nullif(v.tech_specs->>'accel100To200Sec', '')::numeric,
      'modification_count', (
        select count(*)::int
        from public.documents d
        where d.vehicle_id = v.id
          and d.show_on_public_showcase = true
      ),
      'total_likes', (
        select count(*)::int
        from public.showcase_swipes s
        where s.vehicle_id = v.id
          and s.decision = 'like'
      ),
      'has_silhouette', (v.silhouette_image_url is not null and btrim(v.silhouette_image_url) <> ''),
      'silhouette_image_url', v.silhouette_image_url,
      'updated_at', v.updated_at,
      'showcase_build_dna', v.showcase_build_dna,
      'build_personality_tags', coalesce(v.tech_specs->'buildPersonalityTags', '[]'::jsonb),
      'sort_key', md5(v.id::text || v_user::text)
    ) as row_data
    from public.vehicles v
    where v.is_public = true
      and v.showcase_swipe_opt_in = true
      and v.public_slug is not null
      and v.user_id is distinct from v_user
      and not exists (
        select 1
        from public.showcase_swipes s
        where s.swiper_user_id = v_user
          and s.vehicle_id = v.id
          and s.calendar_week_start = v_week
      )
    order by md5(v.id::text || v_user::text)
    limit v_limit
  ) sub;

  return v_rows;
end;
$fn_list_showcase_swipe_candidates$;

revoke all on function public.list_showcase_swipe_candidates(int) from public;
grant execute on function public.list_showcase_swipe_candidates(int) to authenticated;

comment on function public.list_showcase_swipe_candidates(int) is
  'Authenticated swipe deck — excludes own builds and swipes from the current Berlin calendar week.';

-- Public /swipe weekly reset: migration 00091 (after 00088_public_swipe_cards.sql).
