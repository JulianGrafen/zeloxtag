-- Schrauber (contributors) must not SELECT full vehicle rows (VIN, expose_token,
-- owner user_id, public_slug). Replace table access with a redacted resolver.

drop policy if exists "vehicles_select_contributor" on public.vehicles;

create or replace function public.resolve_contributor_vehicle(p_vehicle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_vehicle jsonb;
begin
  if p_vehicle_id is null then
    return null;
  end if;

  if not public.is_active_vehicle_contributor(p_vehicle_id) then
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
    'public_slug', null,
    'expose_token', null,
    'is_expose_active', false,
    'created_at', v.created_at,
    'updated_at', v.updated_at
  )
    into v_vehicle
  from public.vehicles v
  where v.id = p_vehicle_id;

  return v_vehicle;
end;
$$;

revoke all on function public.resolve_contributor_vehicle(uuid) from public;
grant execute on function public.resolve_contributor_vehicle(uuid) to authenticated;

comment on function public.resolve_contributor_vehicle(uuid) is
  'Redacted vehicle twin for active Schrauber — no VIN, owner id, slug, or exposé token.';
