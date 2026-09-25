-- Include cached Build DNA on swipe deck candidates (read-only JSON for UI).

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
      'showcase_build_dna', v.showcase_build_dna,
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
  'Authenticated swipe deck: vehicle quartett fields + optional showcase_build_dna JSON.';
