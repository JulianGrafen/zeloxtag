-- =============================================================================
-- ZeloxTag · Build-Swipe (showcase discovery + likes)
-- Migration: 00067_showcase_swipe
--
-- Run this file in full (SQL editor must include closing $fn_...$; tags).
-- =============================================================================

alter table public.vehicles
  add column if not exists showcase_swipe_opt_in boolean not null default false;

comment on column public.vehicles.showcase_swipe_opt_in is
  'When true (and is_public), vehicle appears in authenticated build-swipe deck.';

create table if not exists public.showcase_swipes (
  id uuid primary key default gen_random_uuid(),
  swiper_user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  decision text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint showcase_swipes_decision_check check (decision in ('like', 'pass')),
  constraint showcase_swipes_unique_pair unique (swiper_user_id, vehicle_id)
);

create index if not exists showcase_swipes_vehicle_like_idx
  on public.showcase_swipes (vehicle_id)
  where decision = 'like';

create index if not exists showcase_swipes_swiper_idx
  on public.showcase_swipes (swiper_user_id, created_at desc);

comment on table public.showcase_swipes is
  'Authenticated user decisions on public showcase builds (like/pass).';

alter table public.showcase_swipes enable row level security;
alter table public.showcase_swipes force row level security;

drop policy if exists showcase_swipes_select_own on public.showcase_swipes;
create policy showcase_swipes_select_own
  on public.showcase_swipes
  for select
  to authenticated
  using (swiper_user_id = auth.uid());

drop policy if exists showcase_swipes_insert_own on public.showcase_swipes;
create policy showcase_swipes_insert_own
  on public.showcase_swipes
  for insert
  to authenticated
  with check (swiper_user_id = auth.uid());

revoke all on table public.showcase_swipes from anon;
grant select, insert on table public.showcase_swipes to authenticated;

create table if not exists public.vehicle_showcase_like_inbox (
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  last_seen_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, vehicle_id)
);

comment on table public.vehicle_showcase_like_inbox is
  'Owner read cursor for new build-swipe likes per vehicle.';

alter table public.vehicle_showcase_like_inbox enable row level security;
alter table public.vehicle_showcase_like_inbox force row level security;

drop policy if exists vehicle_showcase_like_inbox_select_own on public.vehicle_showcase_like_inbox;
create policy vehicle_showcase_like_inbox_select_own
  on public.vehicle_showcase_like_inbox
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists vehicle_showcase_like_inbox_upsert_own on public.vehicle_showcase_like_inbox;
create policy vehicle_showcase_like_inbox_upsert_own
  on public.vehicle_showcase_like_inbox
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on table public.vehicle_showcase_like_inbox from anon;
grant select, insert, update on table public.vehicle_showcase_like_inbox to authenticated;

-- ---------------------------------------------------------------------------
-- Swipe deck candidates (whitelist fields only)
-- ---------------------------------------------------------------------------

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
      'has_silhouette', (v.silhouette_image_url is not null and btrim(v.silhouette_image_url) <> ''),
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
  'Authenticated swipe deck — public showcase fields only; excludes own vehicles and prior swipes.';

-- ---------------------------------------------------------------------------
-- Owner inbox summary (likes on owned vehicles)
-- ---------------------------------------------------------------------------

drop function if exists public.get_showcase_swipe_inbox_summary();

create function public.get_showcase_swipe_inbox_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $fn_get_showcase_swipe_inbox_summary$
declare
  v_user uuid := auth.uid();
  v_rows jsonb;
begin
  if v_user is null then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(row_data), '[]'::jsonb)
    into v_rows
  from (
    select jsonb_build_object(
      'vehicle_id', v.id,
      'tag_uuid', (
        select t.uuid
        from public.tags t
        where t.vehicle_id = v.id
          and t.status = 'active'
        order by t.created_at desc
        limit 1
      ),
      'make', v.make,
      'model', v.model,
      'total_likes', (
        select count(*)::int
        from public.showcase_swipes s
        where s.vehicle_id = v.id
          and s.decision = 'like'
      ),
      'unread_likes', (
        select count(*)::int
        from public.showcase_swipes s
        where s.vehicle_id = v.id
          and s.decision = 'like'
          and s.created_at > coalesce(
            (
              select i.last_seen_at
              from public.vehicle_showcase_like_inbox i
              where i.user_id = v_user
                and i.vehicle_id = v.id
            ),
            '1970-01-01'::timestamptz
          )
      )
    ) as row_data
    from public.vehicles v
    where v.user_id = v_user
  ) sub;

  return v_rows;
end;
$fn_get_showcase_swipe_inbox_summary$;

revoke all on function public.get_showcase_swipe_inbox_summary() from public;
grant execute on function public.get_showcase_swipe_inbox_summary() to authenticated;

comment on function public.get_showcase_swipe_inbox_summary() is
  'Per owned vehicle: total likes and unread likes since last_seen_at.';
