-- =============================================================================
-- ZeloxTag · Claim RPC (reassert if 00049 was skipped on prod)
-- Migration: 00051_claim_unclaimed_tag
-- =============================================================================
-- App code calls public.claim_unclaimed_tag via PostgREST. Without this function
-- every claim returns PGRST202 and the generic "Dieser Tag kann nicht
-- beansprucht werden." message.
-- =============================================================================

create or replace function public.claim_unclaimed_tag(
  p_uuid text,
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
  v_tag public.tags%rowtype;
  v_vehicle_id uuid;
  v_updated integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated');
  end if;

  if p_uuid is null or btrim(p_uuid) = ''
     or p_make is null or btrim(p_make) = ''
     or p_model is null or btrim(p_model) = ''
     or p_year is null then
    return jsonb_build_object('ok', false, 'error', 'unavailable');
  end if;

  select *
    into v_tag
  from public.tags
  where uuid = btrim(p_uuid)
  for update;

  if not found
     or v_tag.status is distinct from 'unclaimed'
     or v_tag.vehicle_id is not null then
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

  update public.tags
  set
    status = 'active',
    vehicle_id = v_vehicle_id
  where id = v_tag.id
    and status = 'unclaimed'
    and vehicle_id is null;

  get diagnostics v_updated = row_count;

  if v_updated <> 1 then
    delete from public.vehicles where id = v_vehicle_id;
    return jsonb_build_object('ok', false, 'error', 'unavailable');
  end if;

  return jsonb_build_object(
    'ok', true,
    'tag_uuid', v_tag.uuid,
    'vehicle_id', v_vehicle_id
  );
exception
  when others then
    if v_vehicle_id is not null then
      delete from public.vehicles where id = v_vehicle_id;
    end if;
    return jsonb_build_object('ok', false, 'error', 'unavailable');
end;
$$;

revoke all on function public.claim_unclaimed_tag(text, text, text, integer, text) from public;
grant execute on function public.claim_unclaimed_tag(text, text, text, integer, text)
  to authenticated;

comment on function public.claim_unclaimed_tag(text, text, text, integer, text) is
  'Session claim: insert vehicle for auth.uid(), activate unclaimed tag. Missing and already-claimed UUIDs both return unavailable. Does not mint tags.';

notify pgrst, 'reload schema';
