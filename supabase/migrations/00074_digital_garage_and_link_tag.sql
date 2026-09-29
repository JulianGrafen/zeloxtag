-- =============================================================================
-- ZeloxTag · Digital garage (vehicle without tag) + link tag to existing vehicle
-- Migration: 00074_digital_garage_and_link_tag
-- =============================================================================

create or replace function public.create_garage_vehicle(
  p_make text,
  p_model text,
  p_year integer,
  p_vin text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_uid uuid := auth.uid();
  v_vehicle_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated');
  end if;

  if p_make is null or btrim(p_make) = ''
     or p_model is null or btrim(p_model) = ''
     or p_year is null then
    return jsonb_build_object('ok', false, 'error', 'unavailable');
  end if;

  if p_year < 1900 or p_year > 2100 then
    return jsonb_build_object('ok', false, 'error', 'unavailable');
  end if;

  insert into public.vehicles (user_id, make, model, year, vin)
  values (
    v_uid,
    btrim(p_make),
    btrim(p_model),
    p_year,
    nullif(btrim(coalesce(p_vin, '')), '')
  )
  returning id into v_vehicle_id;

  return jsonb_build_object(
    'ok', true,
    'vehicle_id', v_vehicle_id
  );
exception
  when others then
    return jsonb_build_object('ok', false, 'error', 'unavailable');
end;
$$;

create or replace function public.link_unclaimed_tag_to_vehicle(
  p_tag_uuid text,
  p_vehicle_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_uid uuid := auth.uid();
  v_tag public.tags%rowtype;
  v_vehicle public.vehicles%rowtype;
  v_updated integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated');
  end if;

  if p_tag_uuid is null or btrim(p_tag_uuid) = ''
     or p_vehicle_id is null then
    return jsonb_build_object('ok', false, 'error', 'unavailable');
  end if;

  select *
    into v_vehicle
  from public.vehicles
  where id = p_vehicle_id
    and user_id = v_uid
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'unavailable');
  end if;

  if exists (
    select 1
    from public.tags t
    where t.vehicle_id = p_vehicle_id
      and t.status = 'active'
  ) then
    return jsonb_build_object('ok', false, 'error', 'vehicle_already_linked');
  end if;

  select *
    into v_tag
  from public.tags
  where uuid = btrim(p_tag_uuid)
  for update;

  if not found
     or v_tag.status is distinct from 'unclaimed'
     or v_tag.vehicle_id is not null then
    return jsonb_build_object('ok', false, 'error', 'unavailable');
  end if;

  update public.tags
  set
    status = 'active',
    vehicle_id = p_vehicle_id
  where id = v_tag.id
    and status = 'unclaimed'
    and vehicle_id is null;

  get diagnostics v_updated = row_count;

  if v_updated <> 1 then
    return jsonb_build_object('ok', false, 'error', 'unavailable');
  end if;

  return jsonb_build_object(
    'ok', true,
    'tag_uuid', v_tag.uuid,
    'vehicle_id', p_vehicle_id
  );
exception
  when others then
    return jsonb_build_object('ok', false, 'error', 'unavailable');
end;
$$;

revoke all on function public.create_garage_vehicle(text, text, integer, text) from public;
grant execute on function public.create_garage_vehicle(text, text, integer, text)
  to authenticated;

revoke all on function public.link_unclaimed_tag_to_vehicle(text, uuid) from public;
grant execute on function public.link_unclaimed_tag_to_vehicle(text, uuid)
  to authenticated;

comment on function public.create_garage_vehicle(text, text, integer, text) is
  'PWA onboarding: insert vehicle for auth.uid() without a physical tag.';

comment on function public.link_unclaimed_tag_to_vehicle(text, uuid) is
  'Pair an unclaimed tag with an existing owned vehicle (one active tag per vehicle).';

notify pgrst, 'reload schema';
