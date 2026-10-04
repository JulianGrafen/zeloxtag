-- =============================================================================
-- ZeloxTag · Expose is_story_public on QR tag resolver (public twin)
-- Migration: 00080_resolve_tag_build_story
-- =============================================================================

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

  if v_tag.status is distinct from 'active' or v_tag.vehicle_id is null then
    return null;
  end if;

  select jsonb_build_object(
    'id', case when v.is_public then v.id else null end,
    'user_id', null,
    'make', v.make,
    'model', v.model,
    'year', v.year,
    'vin', null,
    'tech_specs',
      case when v.is_public then coalesce(v.tech_specs, '{}'::jsonb) else null end,
    'silhouette_image_url',
      case when v.is_public then v.silhouette_image_url else null end,
    'sound_url', case when v.is_public then v.sound_url else null end,
    'is_public', v.is_public,
    'hide_financials', v.hide_financials,
    'public_slug', case when v.is_public then v.public_slug else null end,
    'is_story_public',
      case when v.is_public then coalesce(v.is_story_public, false) else false end,
    'showcase_build_dna',
      case when v.is_public then v.showcase_build_dna else null end,
    'showcase_build_dna_fingerprint',
      case when v.is_public then v.showcase_build_dna_fingerprint else null end,
    'showcase_build_dna_updated_at',
      case when v.is_public then v.showcase_build_dna_updated_at else null end,
    'created_at', v.created_at,
    'updated_at', v.updated_at
  )
    into v_vehicle
  from public.vehicles v
  where v.id = v_tag.vehicle_id;

  if v_vehicle is null then
    return null;
  end if;

  return jsonb_build_object(
    'tag', jsonb_build_object(
      'id', v_tag.id,
      'uuid', v_tag.uuid,
      'status', v_tag.status,
      'vehicle_id', null,
      'created_at', v_tag.created_at,
      'updated_at', v_tag.updated_at
    ),
    'vehicle', v_vehicle,
    'documents', '[]'::jsonb
  );
end;
$$;

revoke all on function public.resolve_tag_by_uuid(text) from public;
grant execute on function public.resolve_tag_by_uuid(text) to anon, authenticated;

comment on function public.resolve_tag_by_uuid(text) is
  'QR resolver — public twin includes is_story_public for guest showcase gating.';
