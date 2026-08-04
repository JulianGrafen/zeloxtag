-- =============================================================================
-- ZeloxTag · Zero-Trust RLS enforcement
-- Migration: 00014_zero_trust_enforce_rls
-- =============================================================================
-- Principle of Least Privilege:
--   • vehicles / documents: authenticated owner-only CRUD (auth.uid() = user_id)
--   • anon: NO direct table access (digital twin stays on resolve_tag_by_uuid /
--     service-role server paths)
--   • tags: no blanket public SELECT; owners see linked tags; claim UPDATE kept
--   • storage.vehicle-documents: PRIVATE bucket; owner-only object access
-- =============================================================================

-- -----------------------------------------------------------------------------
-- FORCE RLS (defense in depth — idempotent with 00012)
-- -----------------------------------------------------------------------------
alter table public.vehicles force row level security;
alter table public.documents force row level security;
alter table public.tags force row level security;

-- -----------------------------------------------------------------------------
-- Privilege hygiene: block anonymous table access entirely
-- -----------------------------------------------------------------------------
revoke all on table public.vehicles from anon;
revoke all on table public.documents from anon;
revoke all on table public.tags from anon;

grant select, insert, update, delete on table public.vehicles to authenticated;
grant select, insert, update, delete on table public.documents to authenticated;
grant select, update on table public.tags to authenticated;
revoke insert, delete on table public.tags from authenticated;

-- -----------------------------------------------------------------------------
-- vehicles: owner-only CRUD
-- -----------------------------------------------------------------------------
drop policy if exists "vehicles_select_own" on public.vehicles;
drop policy if exists "vehicles_insert_own" on public.vehicles;
drop policy if exists "vehicles_update_own" on public.vehicles;
drop policy if exists "vehicles_delete_own" on public.vehicles;

create policy "vehicles_select_own" on public.vehicles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "vehicles_insert_own" on public.vehicles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "vehicles_update_own" on public.vehicles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "vehicles_delete_own" on public.vehicles
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- documents: owner-only CRUD + vehicle ownership check on write
-- -----------------------------------------------------------------------------
drop policy if exists "documents_select_own" on public.documents;
drop policy if exists "documents_insert_own" on public.documents;
drop policy if exists "documents_update_own" on public.documents;
drop policy if exists "documents_delete_own" on public.documents;
drop policy if exists "documents_select_active_tagged" on public.documents;

create policy "documents_select_own" on public.documents
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "documents_insert_own" on public.documents
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and vehicle_id in (
      select v.id from public.vehicles v where v.user_id = auth.uid()
    )
  );

create policy "documents_update_own" on public.documents
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and vehicle_id in (
      select v.id from public.vehicles v where v.user_id = auth.uid()
    )
  );

create policy "documents_delete_own" on public.documents
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- tags: no public SELECT; owners read linked tags; claim UPDATE authenticated
-- -----------------------------------------------------------------------------
drop policy if exists "tags_select_public" on public.tags;
drop policy if exists "tags_select_own" on public.tags;
drop policy if exists "tags_claim_unclaimed" on public.tags;
drop policy if exists "tags_update_owner" on public.tags;
drop policy if exists "tags_insert_deny" on public.tags;
drop policy if exists "tags_delete_deny" on public.tags;

create policy "tags_select_own" on public.tags
  for select
  to authenticated
  using (
    vehicle_id in (
      select v.id from public.vehicles v where v.user_id = auth.uid()
    )
  );

create policy "tags_claim_unclaimed" on public.tags
  for update
  to authenticated
  using (
    status = 'unclaimed'
    and vehicle_id is null
    and auth.uid() is not null
  )
  with check (
    status = 'active'
    and vehicle_id is not null
    and vehicle_id in (
      select v.id from public.vehicles v where v.user_id = auth.uid()
    )
  );

create policy "tags_update_owner" on public.tags
  for update
  to authenticated
  using (
    vehicle_id in (
      select v.id from public.vehicles v where v.user_id = auth.uid()
    )
  )
  with check (
    vehicle_id in (
      select v.id from public.vehicles v where v.user_id = auth.uid()
    )
  );

-- QR digital-twin / unclaimed resolve remains SECURITY DEFINER + service role.
revoke all on function public.resolve_tag_by_uuid(text) from public;
grant execute on function public.resolve_tag_by_uuid(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Storage: private bucket + owner-only RLS (no anonymous object listing/read)
-- -----------------------------------------------------------------------------
update storage.buckets
set
  public = false,
  file_size_limit = 26214400,
  allowed_mime_types = array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]::text[]
where id = 'vehicle-documents';

drop policy if exists "vehicle_documents_public_read" on storage.objects;
drop policy if exists "vehicle_documents_owner_select" on storage.objects;
drop policy if exists "vehicle_documents_owner_insert" on storage.objects;
drop policy if exists "vehicle_documents_owner_update" on storage.objects;
drop policy if exists "vehicle_documents_owner_delete" on storage.objects;

create policy "vehicle_documents_owner_select"
  on storage.objects
  for select
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
