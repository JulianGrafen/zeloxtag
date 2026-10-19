-- Public anonymous build swipe: guarded reads/writes (no direct anon table/view access).
-- Rate limiting belongs in the Next.js API layer.

create table if not exists public.anonymous_showcase_swipes (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  decision text not null,
  client_session_hash text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint anonymous_showcase_swipes_decision_check
    check (decision in ('like', 'pass')),
  constraint anonymous_showcase_swipes_unique_session_vehicle
    unique (client_session_hash, vehicle_id),
  constraint anonymous_showcase_swipes_session_hash_format
    check (client_session_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists anonymous_showcase_swipes_vehicle_decision_idx
  on public.anonymous_showcase_swipes (vehicle_id, decision);

comment on table public.anonymous_showcase_swipes is
  'Anonymous build-swipe votes; accessible only via SECURITY DEFINER RPCs.';

alter table public.anonymous_showcase_swipes enable row level security;
alter table public.anonymous_showcase_swipes force row level security;

revoke all on table public.anonymous_showcase_swipes from public;
revoke all on table public.anonymous_showcase_swipes from anon;
revoke all on table public.anonymous_showcase_swipes from authenticated;

create or replace view public.public_swipe_cards_view as
select
  v.id,
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
  p_limit int default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $fn_list_public_swipe_cards$
declare
  v_limit int := least(greatest(coalesce(p_limit, 10), 1), 20);
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
    order by md5(c.id::text || v_seed)
    limit v_limit
  ) sub;

  return coalesce(v_rows, '[]'::jsonb);
end;
$fn_list_public_swipe_cards$;

revoke all on function public.list_public_swipe_cards(uuid[], int) from public;
grant execute on function public.list_public_swipe_cards(uuid[], int) to anon;
grant execute on function public.list_public_swipe_cards(uuid[], int) to authenticated;

comment on function public.list_public_swipe_cards(uuid[], int) is
  'Public swipe deck cards (safe fields only). Excludes vehicle ids already swiped client-side.';

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
    client_session_hash
  )
  values (p_vehicle_id, v_decision, p_client_session_hash)
  on conflict on constraint anonymous_showcase_swipes_unique_session_vehicle
  do nothing;

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

revoke all on function public.register_anonymous_swipe(uuid, text, text) from public;
grant execute on function public.register_anonymous_swipe(uuid, text, text) to anon;
grant execute on function public.register_anonymous_swipe(uuid, text, text) to authenticated;

comment on function public.register_anonymous_swipe(uuid, text, text) is
  'Records anonymous up/down swipe; returns aggregated community score.';
