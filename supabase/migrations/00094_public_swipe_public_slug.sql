-- Public swipe: expose public_slug for showcase deep links (/v/{slug}).

drop view if exists public.public_swipe_cards_view;

create view public.public_swipe_cards_view as
select
  v.id,
  v.public_slug,
  trim(
    both
    from
      concat_ws(
        ' ',
        v.make,
        v.model,
        case when v.year is not null then '· ' || v.year::text else null end
      )
  ) as car_name,
  nullif(v.tech_specs->>'powerPs', '')::numeric as hp,
  case
    when coalesce(v.hide_financials, false) then null
    else (
      select coalesce(sum(d.amount), 0::numeric)
      from public.documents d
      where d.vehicle_id = v.id
        and d.show_on_public_showcase = true
        and d.type = 'invoice'
        and d.amount is not null
    )
  end as total_invested_amount,
  (
    select coalesce(jsonb_agg(x.title), '[]'::jsonb)
    from (
      select d.title
      from public.documents d
      where d.vehicle_id = v.id
        and d.show_on_public_showcase = true
      order by d.date desc nulls last, d.created_at desc
      limit 3
    ) x
  ) as top_3_mods,
  exists (
    select 1
    from public.documents d
    where d.vehicle_id = v.id
      and d.type = 'abe'
      and d.show_on_public_showcase = true
  ) as is_verified_build,
  (
    select count(*)::int
    from public.showcase_swipes s
    where s.vehicle_id = v.id
      and s.decision = 'like'
  ) + (
    select count(*)::int
    from public.anonymous_showcase_swipes a
    where a.vehicle_id = v.id
      and a.decision = 'like'
  ) as upvotes_count,
  (
    select count(*)::int
    from public.showcase_swipes s
    where s.vehicle_id = v.id
      and s.decision = 'pass'
  ) + (
    select count(*)::int
    from public.anonymous_showcase_swipes a
    where a.vehicle_id = v.id
      and a.decision = 'pass'
  ) as downvotes_count,
  coalesce(v.tech_specs->'buildPersonalityTags', '[]'::jsonb) as build_personality_tags,
  (
    select count(*)::int
    from public.documents d
    where d.vehicle_id = v.id
      and d.show_on_public_showcase = true
      and (
        d.type = 'invoice'
        or coalesce(d.category, '') = 'Manueller Eintrag'
      )
  ) as modification_count,
  v.updated_at
from public.vehicles v
where v.is_public = true
  and v.showcase_swipe_opt_in = true
  and v.public_slug is not null
  and btrim(v.public_slug) <> ''
  and v.silhouette_image_url is not null
  and btrim(v.silhouette_image_url) <> '';

revoke all on public.public_swipe_cards_view from public;
revoke all on public.public_swipe_cards_view from anon;
revoke all on public.public_swipe_cards_view from authenticated;

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
      'public_slug', c.public_slug,
      'car_name', c.car_name,
      'hp', c.hp,
      'total_invested_amount', c.total_invested_amount,
      'thumbnail_path',
        '/api/vehicle/silhouette/' || c.id::text
        || '?w=640&v='
        || floor(extract(epoch from c.updated_at))::bigint::text,
      'top_3_mods', c.top_3_mods,
      'build_personality_tags', c.build_personality_tags,
      'modification_count', c.modification_count,
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
