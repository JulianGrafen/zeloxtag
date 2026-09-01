-- =============================================================================
-- ZeloxTag · C6/C7: private vehicle-documents + session Storage + claim RPC
-- Migration: 00049_vehicle_documents_session_storage
-- =============================================================================
-- Bucket stays private (00014). Owner object policies are unchanged.
-- Contributors need Storage RLS for invoice objects at `{vehicleId}/{documentId}-…`
-- so uploads/downloads can use the session client (no service role).
-- Claim uses SECURITY DEFINER so unclaimed tags are never session-SELECTed (C1).
-- =============================================================================

update storage.buckets
set public = false
where id = 'vehicle-documents';

-- -----------------------------------------------------------------------------
-- Path helpers for `{vehicleId}/{documentId}-{filename}`
-- -----------------------------------------------------------------------------
create or replace function public.vehicle_documents_object_vehicle_id(p_name text)
returns uuid
language sql
immutable
parallel safe
as $$
  select case
    when split_part(coalesce(p_name, ''), '/', 1)
      ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 1)::uuid
    else null
  end;
$$;

create or replace function public.vehicle_documents_object_document_id(p_name text)
returns uuid
language sql
immutable
parallel safe
as $$
  select case
    when split_part(coalesce(p_name, ''), '/', 2)
      ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-'
    then left(split_part(p_name, '/', 2), 36)::uuid
    else null
  end;
$$;

revoke all on function public.vehicle_documents_object_vehicle_id(text) from public;
revoke all on function public.vehicle_documents_object_document_id(text) from public;
grant execute on function public.vehicle_documents_object_vehicle_id(text) to authenticated;
grant execute on function public.vehicle_documents_object_document_id(text) to authenticated;

-- -----------------------------------------------------------------------------
-- Contributor Storage: invoices only, history toggle matches documents RLS
-- -----------------------------------------------------------------------------
drop policy if exists "vehicle_documents_contributor_select" on storage.objects;
drop policy if exists "vehicle_documents_contributor_insert" on storage.objects;
drop policy if exists "vehicle_documents_contributor_update" on storage.objects;
drop policy if exists "vehicle_documents_contributor_delete" on storage.objects;

create policy "vehicle_documents_contributor_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'vehicle-documents'
    and public.is_active_vehicle_contributor(
      public.vehicle_documents_object_vehicle_id(name)
    )
    and exists (
      select 1
      from public.documents d
      where d.id = public.vehicle_documents_object_document_id(name)
        and d.vehicle_id = public.vehicle_documents_object_vehicle_id(name)
        and d.type = 'invoice'
        and (
          d.created_by = auth.uid()
          or public.contributor_can_read_vehicle_history(d.vehicle_id)
        )
    )
  );

create policy "vehicle_documents_contributor_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'vehicle-documents'
    and public.is_active_vehicle_contributor(
      public.vehicle_documents_object_vehicle_id(name)
    )
    and public.vehicle_documents_object_document_id(name) is not null
  );

create policy "vehicle_documents_contributor_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'vehicle-documents'
    and owner = auth.uid()
    and public.is_active_vehicle_contributor(
      public.vehicle_documents_object_vehicle_id(name)
    )
  )
  with check (
    bucket_id = 'vehicle-documents'
    and owner = auth.uid()
    and public.is_active_vehicle_contributor(
      public.vehicle_documents_object_vehicle_id(name)
    )
  );

create policy "vehicle_documents_contributor_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'vehicle-documents'
    and owner = auth.uid()
    and public.is_active_vehicle_contributor(
      public.vehicle_documents_object_vehicle_id(name)
    )
  );

-- -----------------------------------------------------------------------------
-- Possession is Proof: claim an unclaimed tag without a session SELECT on tags
-- -----------------------------------------------------------------------------
create or replace function public.claim_unclaimed_tag(
  p_uuid text,
  p_make text,
  p_model text,
  p_year integer,
  p_vin text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_uid uuid := auth.uid();
  v_tag public.tags%rowtype;
  v_vehicle_id uuid;
  v_updated integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated');
  end if;

  if p_uuid is null or btrim(p_uuid) = ''
     or p_make is null or btrim(p_make) = ''
     or p_model is null or btrim(p_model) = ''
     or p_year is null then
    return jsonb_build_object('ok', false, 'error', 'unavailable');
  end if;

  select *
    into v_tag
  from public.tags
  where uuid = btrim(p_uuid)
  for update;

  if not found
     or v_tag.status is distinct from 'unclaimed'
     or v_tag.vehicle_id is not null then
    return jsonb_build_object('ok', false, 'error', 'unavailable');
  end if;

  insert into public.vehicles (user_id, make, model, year, vin)
  values (
    v_uid,
    btrim(p_make),
    btrim(p_model),
    p_year,
    nullif(btrim(coalesce(p_vin, '')), '')
  )
  returning id into v_vehicle_id;

  update public.tags
  set
    status = 'active',
    vehicle_id = v_vehicle_id
  where id = v_tag.id
    and status = 'unclaimed'
    and vehicle_id is null;

  get diagnostics v_updated = row_count;

  if v_updated <> 1 then
    delete from public.vehicles where id = v_vehicle_id;
    return jsonb_build_object('ok', false, 'error', 'unavailable');
  end if;

  return jsonb_build_object(
    'ok', true,
    'tag_uuid', v_tag.uuid,
    'vehicle_id', v_vehicle_id
  );
exception
  when others then
    if v_vehicle_id is not null then
      delete from public.vehicles where id = v_vehicle_id;
    end if;
    return jsonb_build_object('ok', false, 'error', 'unavailable');
end;
$$;

revoke all on function public.claim_unclaimed_tag(text, text, text, integer, text) from public;
grant execute on function public.claim_unclaimed_tag(text, text, text, integer, text)
  to authenticated;

comment on function public.claim_unclaimed_tag(text, text, text, integer, text) is
  'Session claim: insert vehicle for auth.uid(), activate unclaimed tag. Missing and already-claimed UUIDs both return unavailable. Does not mint tags.';
