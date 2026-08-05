-- =============================================================================
-- ZeloxTag · Vehicle technical specs (Antrieb & Fahrwerk)
-- Migration: 00024_vehicles_tech_specs
-- =============================================================================
-- Ships after 00023 so resolve_tag keeps silhouette_image_url + tech_specs.
-- =============================================================================

alter table public.vehicles
  add column if not exists tech_specs jsonb not null default '{}'::jsonb;

comment on column public.vehicles.tech_specs is
  'Optional structured vehicle tech data (engine, power, drivetrain, …).';

create or replace function public.resolve_tag_by_uuid(p_uuid text)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_tag public.tags%rowtype;
  v_vehicle jsonb;
begin
  if p_uuid is null or btrim(p_uuid) = '' then
    return null;
  end if;

  select *
    into v_tag
  from public.tags t
  where t.uuid = btrim(p_uuid)
  limit 1;

  if not found then
    return null;
  end if;

  if v_tag.status = 'active' and v_tag.vehicle_id is not null then
    select jsonb_build_object(
      'id', v.id,
      'user_id', null,
      'make', v.make,
      'model', v.model,
      'year', v.year,
      'vin', null,
      'tech_specs', coalesce(v.tech_specs, '{}'::jsonb),
      'silhouette_image_url', v.silhouette_image_url,
      'created_at', v.created_at,
      'updated_at', v.updated_at
    )
      into v_vehicle
    from public.vehicles v
    where v.id = v_tag.vehicle_id;
  else
    v_vehicle := null;
  end if;

  return jsonb_build_object(
    'tag', to_jsonb(v_tag),
    'vehicle', v_vehicle,
    'documents', '[]'::jsonb
  );
end;
$$;

revoke all on function public.resolve_tag_by_uuid(text) from public;
grant execute on function public.resolve_tag_by_uuid(text) to anon, authenticated;

comment on function public.resolve_tag_by_uuid(text) is
  'Public QR resolver: vehicle identity + tech_specs + silhouette (no docs/VIN/owner id).';
