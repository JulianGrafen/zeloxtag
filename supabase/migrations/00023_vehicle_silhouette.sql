-- =============================================================================
-- ZeloxTag · Vehicle side-profile silhouette (transparent PNG)
-- Migration: 00023_vehicle_silhouette
-- =============================================================================
-- Owner uploads a side photo → BG removal → public Storage URL on vehicles.
-- =============================================================================

alter table public.vehicles
  add column if not exists silhouette_image_url text null;

comment on column public.vehicles.silhouette_image_url is
  'Public Storage URL of transparent side-profile PNG for dashboard roll-in.';

-- Public QR resolver: expose silhouette with vehicle identity (no VIN/owner).
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
  'Public QR resolver: vehicle identity + silhouette (no docs/VIN/owner id).';

-- -----------------------------------------------------------------------------
-- Storage: public silhouettes (safe for guest digital twin)
-- Path: {vehicle_id}/silhouette.png
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-silhouettes',
  'vehicle-silhouettes',
  true,
  5242880, -- 5 MB
  array['image/png']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "vehicle_silhouettes_public_read" on storage.objects;
drop policy if exists "vehicle_silhouettes_owner_insert" on storage.objects;
drop policy if exists "vehicle_silhouettes_owner_update" on storage.objects;
drop policy if exists "vehicle_silhouettes_owner_delete" on storage.objects;

create policy "vehicle_silhouettes_public_read"
  on storage.objects
  for select
  using (bucket_id = 'vehicle-silhouettes');

create policy "vehicle_silhouettes_owner_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'vehicle-silhouettes'
    and exists (
      select 1
      from public.vehicles v
      where v.id::text = split_part(name, '/', 1)
        and v.user_id = auth.uid()
    )
  );

create policy "vehicle_silhouettes_owner_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'vehicle-silhouettes'
    and exists (
      select 1
      from public.vehicles v
      where v.id::text = split_part(name, '/', 1)
        and v.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'vehicle-silhouettes'
    and exists (
      select 1
      from public.vehicles v
      where v.id::text = split_part(name, '/', 1)
        and v.user_id = auth.uid()
    )
  );

create policy "vehicle_silhouettes_owner_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'vehicle-silhouettes'
    and exists (
      select 1
      from public.vehicles v
      where v.id::text = split_part(name, '/', 1)
        and v.user_id = auth.uid()
    )
  );
