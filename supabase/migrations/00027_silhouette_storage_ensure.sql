-- =============================================================================
-- ZeloxTag · Ensure vehicle silhouette storage (idempotent)
-- Migration: 00027_silhouette_storage_ensure
-- =============================================================================
-- Safe to re-run on hosted Supabase if 00023/00025 were skipped or partial.
-- =============================================================================

alter table public.vehicles
  add column if not exists silhouette_image_url text null;

comment on column public.vehicles.silhouette_image_url is
  'Public Storage URL of transparent side-profile PNG for dashboard roll-in.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-silhouettes',
  'vehicle-silhouettes',
  true,
  8388608,
  array['image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "vehicle_silhouettes_public_read" on storage.objects;
create policy "vehicle_silhouettes_public_read"
  on storage.objects
  for select
  using (bucket_id = 'vehicle-silhouettes');

drop policy if exists "vehicle_silhouettes_owner_insert" on storage.objects;
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

drop policy if exists "vehicle_silhouettes_owner_update" on storage.objects;
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

drop policy if exists "vehicle_silhouettes_owner_delete" on storage.objects;
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
