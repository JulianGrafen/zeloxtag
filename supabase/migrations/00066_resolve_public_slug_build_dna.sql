-- =============================================================================
-- ZeloxTag · Public slug resolver exposes cached Build DNA
-- Migration: 00066_resolve_public_slug_build_dna
-- =============================================================================
-- Share links (/v/{public_slug}) must hydrate the same showcase DNA fields as
-- the QR tag resolver so guest showcase rendering can use the DB cache.

create or replace function public.resolve_public_vehicle_by_slug(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_vehicle jsonb;
begin
  if p_slug is null or btrim(p_slug) = '' then
    return null;
  end if;

  select jsonb_build_object(
    'id', v.id,
    'user_id', null,
    'make', v.make,
    'model', v.model,
    'year', v.year,
    'vin', null,
    'tech_specs', coalesce(v.tech_specs, '{}'::jsonb),
    'silhouette_image_url', v.silhouette_image_url,
    'sound_url', v.sound_url,
    'spatial_scene', v.spatial_scene,
    'is_public', v.is_public,
    'hide_financials', v.hide_financials,
    'public_slug', v.public_slug,
    'showcase_build_dna', v.showcase_build_dna,
    'showcase_build_dna_fingerprint', v.showcase_build_dna_fingerprint,
    'showcase_build_dna_updated_at', v.showcase_build_dna_updated_at,
    'created_at', v.created_at,
    'updated_at', v.updated_at
  )
    into v_vehicle
  from public.vehicles v
  where v.public_slug = btrim(p_slug)
    and v.is_public = true
  limit 1;

  if v_vehicle is null then
    return null;
  end if;

  return jsonb_build_object(
    'vehicle', v_vehicle,
    'is_public', true
  );
end;
$$;

revoke all on function public.resolve_public_vehicle_by_slug(text) from public;
grant execute on function public.resolve_public_vehicle_by_slug(text) to anon, authenticated;

comment on function public.resolve_public_vehicle_by_slug(text) is
  'Public share-link resolver by vehicles.public_slug — includes cached Build DNA for guest showcase.';
