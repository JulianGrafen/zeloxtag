-- =============================================================================
-- ZeloxTag · Build Story (public visual timeline)
-- Migration: 00079_vehicle_build_story
-- =============================================================================

alter table public.vehicles
  add column if not exists is_story_public boolean not null default false;

comment on column public.vehicles.is_story_public is
  'When true (and is_public), visitors see the Build Story timeline on the public showcase.';

alter table public.documents
  add column if not exists show_on_build_story boolean not null default false;

comment on column public.documents.show_on_build_story is
  'Owner opt-in: include this umbau photo entry on the public Build Story timeline.';

create index if not exists documents_vehicle_build_story_idx
  on public.documents (vehicle_id, date)
  where show_on_build_story = true;

-- ---------------------------------------------------------------------------
-- Public Build Story entries (image umbauten only)
-- ---------------------------------------------------------------------------

create or replace function public.list_public_build_story(
  p_slug text,
  p_limit int default 12,
  p_offset int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $fn_list_public_build_story$
declare
  v_vehicle_id uuid;
  v_limit int := least(greatest(coalesce(p_limit, 12), 1), 24);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_rows jsonb;
begin
  if p_slug is null or btrim(p_slug) = '' then
    return '[]'::jsonb;
  end if;

  select v.id
    into v_vehicle_id
  from public.vehicles v
  where v.public_slug = btrim(p_slug)
    and v.is_public = true
    and v.is_story_public = true
  limit 1;

  if v_vehicle_id is null then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(row_data), '[]'::jsonb)
    into v_rows
  from (
    select jsonb_build_object(
      'id', d.id,
      'title', d.title,
      'date', coalesce(d.date, d.created_at::date),
      'mileage_km', d.mileage_km,
      'file_url', d.file_url,
      'vendor', d.vendor
    ) as row_data
    from public.documents d
    where d.vehicle_id = v_vehicle_id
      and d.show_on_build_story = true
      and d.invoice_number = '__manual__'
      and coalesce(d.category, '') <> 'service'
      and (
        d.category is null
        or d.category = 'tuning'
        or lower(coalesce(d.category, '')) ~ 'tuning|umbau'
      )
      and d.file_url is not null
      and btrim(d.file_url) <> ''
      and d.file_url not like 'manual://%'
      and d.file_url not like 'mock://%'
      and lower(split_part(d.file_url, '?', 1)) !~ '\.pdf$'
      and lower(split_part(d.file_url, '?', 1)) ~ '\.(jpe?g|png|webp|gif|heic|heif|svg)$'
    order by
      coalesce(d.date, d.created_at::date) asc,
      d.mileage_km asc nulls last,
      d.created_at asc
    limit v_limit
    offset v_offset
  ) sub;

  return v_rows;
end;
$fn_list_public_build_story$;

revoke all on function public.list_public_build_story(text, int, int) from public;
grant execute on function public.list_public_build_story(text, int, int) to anon, authenticated;

comment on function public.list_public_build_story(text, int, int) is
  'Public Build Story: opted-in manual tuning/umbau image documents for a public slug.';

-- ---------------------------------------------------------------------------
-- Slug resolver: expose is_story_public on public vehicle JSON
-- ---------------------------------------------------------------------------

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
    'is_story_public', v.is_story_public,
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
  'Public share-link resolver by vehicles.public_slug — includes Build DNA cache and is_story_public.';
