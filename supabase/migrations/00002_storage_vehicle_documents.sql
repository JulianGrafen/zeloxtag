-- =============================================================================
-- ZeloxTag · Storage bucket for document PDFs / images
-- Migration: 00002_storage_vehicle_documents
-- =============================================================================
-- Path convention: {vehicle_id}/{document_id}-{filename}.pdf
-- Public read (QR digital twin); owner-only write/update/delete via RLS.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-documents',
  'vehicle-documents',
  true,
  26214400, -- 25 MB
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- storage.objects policies
drop policy if exists "vehicle_documents_public_read" on storage.objects;
drop policy if exists "vehicle_documents_owner_insert" on storage.objects;
drop policy if exists "vehicle_documents_owner_update" on storage.objects;
drop policy if exists "vehicle_documents_owner_delete" on storage.objects;

create policy "vehicle_documents_public_read"
  on storage.objects
  for select
  using (bucket_id = 'vehicle-documents');

create policy "vehicle_documents_owner_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'vehicle-documents'
    and exists (
      select 1
      from public.vehicles v
      where v.id::text = split_part(name, '/', 1)
        and v.user_id = auth.uid()
    )
  );

create policy "vehicle_documents_owner_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'vehicle-documents'
    and exists (
      select 1
      from public.vehicles v
      where v.id::text = split_part(name, '/', 1)
        and v.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'vehicle-documents'
    and exists (
      select 1
      from public.vehicles v
      where v.id::text = split_part(name, '/', 1)
        and v.user_id = auth.uid()
    )
  );

create policy "vehicle_documents_owner_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'vehicle-documents'
    and exists (
      select 1
      from public.vehicles v
      where v.id::text = split_part(name, '/', 1)
        and v.user_id = auth.uid()
    )
  );
