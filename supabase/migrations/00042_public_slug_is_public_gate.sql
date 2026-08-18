-- =============================================================================
-- ZeloxTag · Gate public slug resolver to is_public = true
-- Migration: 00042_public_slug_is_public_gate
-- =============================================================================
-- C1 fix: resolve_public_vehicle_by_slug must not leak unpublished profiles when
-- called directly with the anon key (PostgREST bypasses app-layer is_public checks).

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
    'is_public', v.is_public,
    'hide_financials', v.hide_financials,
    'public_slug', v.public_slug,
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
  'Public share-link resolver by vehicles.public_slug — only when is_public = true (no documents/VIN/owner).';
