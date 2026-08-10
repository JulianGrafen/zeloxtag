-- =============================================================================
-- ZeloxTag · Public Showcase Mode (Tuningtreffen / engine-bay QR)
-- Migration: 00030_vehicle_public_showcase
-- =============================================================================

alter table public.vehicles
  add column if not exists is_public boolean not null default false,
  add column if not exists hide_financials boolean not null default true,
  add column if not exists public_slug text;

comment on column public.vehicles.is_public is
  'When true, guests can view the public showcase profile (no auth).';
comment on column public.vehicles.hide_financials is
  'When true, public showcase hides invoice amounts and costs (default privacy).';
comment on column public.vehicles.public_slug is
  'URL-safe share token for /v/{public_slug} — unique when set.';

create unique index if not exists vehicles_public_slug_unique_idx
  on public.vehicles (public_slug)
  where public_slug is not null;

alter table public.vehicles
  drop constraint if exists vehicles_public_slug_format_chk;

alter table public.vehicles
  add constraint vehicles_public_slug_format_chk
  check (
    public_slug is null
    or public_slug ~ '^[a-zA-Z0-9_-]{8,32}$'
  );

-- Extend public QR resolver with showcase flags (still no documents/VIN/owner).
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
      'is_public', v.is_public,
      'hide_financials', v.hide_financials,
      'public_slug', v.public_slug,
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
  'Public QR resolver: vehicle identity + tech_specs + showcase flags (no docs/VIN/owner id).';

-- Resolve a public showcase vehicle by share slug (no tag required).
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
  limit 1;

  if v_vehicle is null then
    return null;
  end if;

  return jsonb_build_object(
    'vehicle', v_vehicle,
    'is_public', (v_vehicle->>'is_public')::boolean
  );
end;
$$;

revoke all on function public.resolve_public_vehicle_by_slug(text) from public;
grant execute on function public.resolve_public_vehicle_by_slug(text) to anon, authenticated;

comment on function public.resolve_public_vehicle_by_slug(text) is
  'Public share-link resolver by vehicles.public_slug (no documents).';
