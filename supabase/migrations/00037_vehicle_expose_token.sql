-- =============================================================================
-- ZeloxTag · 1-Klick Verkaufsexposé (token-gated public dossier)
-- Migration: 00037_vehicle_expose_token
-- =============================================================================

alter table public.vehicles
  add column if not exists expose_token uuid,
  add column if not exists is_expose_active boolean not null default false;

comment on column public.vehicles.expose_token is
  'Unguessable share token for /expose/{token}. Never used as a vehicle id.';
comment on column public.vehicles.is_expose_active is
  'When true, guests with the expose_token can view the sales dossier.';

create unique index if not exists vehicles_expose_token_unique_idx
  on public.vehicles (expose_token)
  where expose_token is not null;

create index if not exists vehicles_expose_token_active_idx
  on public.vehicles (expose_token)
  where expose_token is not null and is_expose_active = true;

-- Public resolver: token only, active exposés only, no owner/VIN/notes.
create or replace function public.resolve_public_expose_by_token(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_vehicle jsonb;
begin
  if p_token is null then
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
    'is_expose_active', v.is_expose_active,
    'created_at', v.created_at,
    'updated_at', v.updated_at
  )
    into v_vehicle
  from public.vehicles v
  where v.expose_token = p_token
    and v.is_expose_active = true
  limit 1;

  if v_vehicle is null then
    return null;
  end if;

  return jsonb_build_object('vehicle', v_vehicle);
end;
$$;

revoke all on function public.resolve_public_expose_by_token(uuid) from public;
grant execute on function public.resolve_public_expose_by_token(uuid) to anon, authenticated;

comment on function public.resolve_public_expose_by_token(uuid) is
  'Public exposé resolver by vehicles.expose_token (active only, no documents/VIN/owner).';
