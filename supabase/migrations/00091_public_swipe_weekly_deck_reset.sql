-- Public /swipe weekly deck reset. Requires 00088_public_swipe_cards.sql.
-- Includes showcase_swipe_calendar_week_date (same as 00090) if not present yet.

do $prereq$
begin
  if to_regclass('public.anonymous_showcase_swipes') is null then
    raise exception
      'Apply 00088_public_swipe_cards.sql before this migration';
  end if;
end;
$prereq$;

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

drop function if exists public.list_public_swipe_cards(uuid[], int);

create or replace function public.list_public_swipe_cards(
  p_exclude_vehicle_ids uuid[] default '{}',
  p_limit int default 10,
  p_client_session_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $fn_list_public_swipe_cards$
declare
  v_limit int := least(greatest(coalesce(p_limit, 10), 1), 20);
  v_week date := public.showcase_swipe_calendar_week_date();
  v_seed text := coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    'anon'
  );
  v_rows jsonb;
begin
  select coalesce(jsonb_agg(row_data order by row_data->>'sort_key'), '[]'::jsonb)
    into v_rows
  from (
    select jsonb_build_object(
      'id', c.id,
      'car_name', c.car_name,
      'hp', c.hp,
      'total_invested_amount', c.total_invested_amount,
      'thumbnail_path',
        '/api/vehicle/silhouette/' || c.id::text
        || '?w=640&v='
        || floor(extract(epoch from c.updated_at))::bigint::text,
      'top_3_mods', c.top_3_mods,
      'is_verified_build', c.is_verified_build,
      'upvotes_count', c.upvotes_count,
      'downvotes_count', c.downvotes_count,
      'clean_score_percent',
        case
          when (c.upvotes_count + c.downvotes_count) < 1 then null
          else round(
            100.0 * c.upvotes_count::numeric
            / (c.upvotes_count + c.downvotes_count)::numeric
          )::int
        end,
      'sort_key', md5(c.id::text || v_seed)
    ) as row_data
    from public.public_swipe_cards_view c
    where not (c.id = any(coalesce(p_exclude_vehicle_ids, '{}'::uuid[])))
      and (
        p_client_session_hash is null
        or p_client_session_hash !~ '^[a-f0-9]{64}$'
        or not exists (
          select 1
          from public.anonymous_showcase_swipes a
          where a.vehicle_id = c.id
            and a.client_session_hash = p_client_session_hash
            and a.calendar_week_start = v_week
        )
      )
    order by md5(c.id::text || v_seed)
    limit v_limit
  ) sub;

  return coalesce(v_rows, '[]'::jsonb);
end;
$fn_list_public_swipe_cards$;

revoke all on function public.list_public_swipe_cards(uuid[], int, text) from public;
grant execute on function public.list_public_swipe_cards(uuid[], int, text) to anon;
grant execute on function public.list_public_swipe_cards(uuid[], int, text) to authenticated;

comment on function public.list_public_swipe_cards(uuid[], int, text) is
  'Public swipe deck; excludes client ids and current-week anonymous swipes for session hash.';

create or replace function public.register_anonymous_swipe(
  p_vehicle_id uuid,
  p_vote_type text,
  p_client_session_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $fn_register_anonymous_swipe$
declare
  v_decision text;
  v_week date := public.showcase_swipe_calendar_week_date();
  v_inserted int;
  v_up int;
  v_down int;
  v_clean int;
begin
  if p_vehicle_id is null then
    raise exception 'vehicle_id required';
  end if;

  if p_client_session_hash is null
    or p_client_session_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid client_session_hash';
  end if;

  v_decision := case lower(btrim(p_vote_type))
    when 'up' then 'like'
    when 'down' then 'pass'
    when 'like' then 'like'
    when 'pass' then 'pass'
    else null
  end;

  if v_decision is null then
    raise exception 'invalid vote_type';
  end if;

  if not exists (
    select 1 from public.public_swipe_cards_view c where c.id = p_vehicle_id
  ) then
    raise exception 'vehicle not eligible';
  end if;

  insert into public.anonymous_showcase_swipes (
    vehicle_id,
    decision,
    client_session_hash,
    calendar_week_start
  )
  values (p_vehicle_id, v_decision, p_client_session_hash, v_week)
  on conflict on constraint anonymous_showcase_swipes_unique_session_vehicle_week
  do update set
    decision = excluded.decision,
    created_at = timezone('utc', now())
  where public.anonymous_showcase_swipes.decision is distinct from excluded.decision;

  get diagnostics v_inserted = row_count;

  select c.upvotes_count, c.downvotes_count
    into v_up, v_down
  from public.public_swipe_cards_view c
  where c.id = p_vehicle_id;

  if (coalesce(v_up, 0) + coalesce(v_down, 0)) > 0 then
    v_clean := round(100.0 * v_up::numeric / (v_up + v_down)::numeric)::int;
  else
    v_clean := null;
  end if;

  return jsonb_build_object(
    'ok', true,
    'already_voted', v_inserted = 0,
    'upvotes_count', coalesce(v_up, 0),
    'downvotes_count', coalesce(v_down, 0),
    'clean_score_percent', v_clean
  );
end;
$fn_register_anonymous_swipe$;
