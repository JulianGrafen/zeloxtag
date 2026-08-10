-- =============================================================================
-- ZeloxTag · Shared Auflagen-Kürzel reference images
-- Migration: 00033_abe_auflagen_kuerzel_images
-- =============================================================================

alter table public.abe_auflagen_kuerzel
  add column if not exists image_path text null
    check (image_path is null or char_length(image_path) between 3 and 256);

comment on column public.abe_auflagen_kuerzel.image_path is
  'Storage object path in abe-auflagen-kuerzel bucket (e.g. 744.jpg).';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'abe-auflagen-kuerzel',
  'abe-auflagen-kuerzel',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "abe_auflagen_kuerzel_public_read" on storage.objects;

create policy "abe_auflagen_kuerzel_public_read"
  on storage.objects
  for select
  using (bucket_id = 'abe-auflagen-kuerzel');
