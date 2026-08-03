-- =============================================================================
-- ZeloxTag · Security hardening (RLS + ownership)
-- Migration: 00012_security_hardening
-- =============================================================================
-- Notes:
--   • 00002_storage_vehicle_documents.sql already exists — this is the next
--     security migration (do not overwrite storage policies).
--   • documents historically owned via vehicles.user_id; we add documents.user_id
--     so RLS can enforce auth.uid() = user_id directly (enterprise requirement).
--   • tags: public SELECT for QR scans remains; INSERT/DELETE stay denied for
--     anon/authenticated (service_role / admin only). Claim UPDATE stays auth-only.
--   • Public digital-twin reads continue via resolve_tag_by_uuid (SECURITY DEFINER).
--
-- Supabase Auth rate limits (configure in Dashboard → Authentication → Rate Limits):
--   • Email OTP / Magic Link: keep default or lower (e.g. 3–4 / hour / IP)
--   • Password sign-in: enable protection against brute force
--   • MFA / TOTP verify: leave tight defaults
-- App-level in-memory limits also apply in Next.js API / Server Actions.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- documents.user_id ownership column
-- -----------------------------------------------------------------------------
alter table public.documents
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

update public.documents d
set user_id = v.user_id
from public.vehicles v
where d.vehicle_id = v.id
  and d.user_id is null;

-- Fail closed if any orphan rows remain without an owner.
do $$
begin
  if exists (select 1 from public.documents where user_id is null) then
    raise exception 'documents.user_id backfill failed: orphan document rows exist';
  end if;
end $$;

alter table public.documents
  alter column user_id set not null;

create index if not exists documents_user_id_idx
  on public.documents using btree (user_id);

-- Keep user_id aligned with the vehicle owner on write.
create or replace function public.documents_set_user_id_from_vehicle()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  owner_id uuid;
begin
  select v.user_id into owner_id
  from public.vehicles v
  where v.id = new.vehicle_id;

  if owner_id is null then
    raise exception 'documents: vehicle % not found', new.vehicle_id;
  end if;

  new.user_id := owner_id;
  return new;
end;
$$;

drop trigger if exists documents_set_user_id on public.documents;
create trigger documents_set_user_id
  before insert or update of vehicle_id on public.documents
  for each row
  execute function public.documents_set_user_id_from_vehicle();

-- -----------------------------------------------------------------------------
-- FORCE RLS (table owners / bypass roles still need explicit grants)
-- -----------------------------------------------------------------------------
alter table public.vehicles force row level security;
alter table public.documents force row level security;
alter table public.tags force row level security;

-- -----------------------------------------------------------------------------
-- vehicles: owner-only CRUD (auth.uid() = user_id)
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
-- documents: owner-only CRUD (auth.uid() = user_id)
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
-- tags: public SELECT only; no public INSERT/DELETE; claim UPDATE authenticated
-- -----------------------------------------------------------------------------
revoke insert, delete on table public.tags from anon, authenticated;
revoke update on table public.tags from anon;
grant select on table public.tags to anon, authenticated;
grant update on table public.tags to authenticated;

drop policy if exists "tags_select_public" on public.tags;
drop policy if exists "tags_claim_unclaimed" on public.tags;
drop policy if exists "tags_update_owner" on public.tags;
drop policy if exists "tags_insert_deny" on public.tags;
drop policy if exists "tags_delete_deny" on public.tags;

create policy "tags_select_public" on public.tags
  for select
  to anon, authenticated
  using (true);

-- Authenticated claim of an unclaimed tag onto a vehicle the user owns.
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

-- Owner may update tags already linked to their vehicles (no reassignment away).
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

-- No INSERT/DELETE policies for anon/authenticated → denied under RLS.
-- Tag minting remains service_role / admin only.

-- -----------------------------------------------------------------------------
-- Privilege hygiene on owner tables
-- -----------------------------------------------------------------------------
revoke all on table public.vehicles from anon;
revoke all on table public.documents from anon;
grant select, insert, update, delete on table public.vehicles to authenticated;
grant select, insert, update, delete on table public.documents to authenticated;

-- Keep SECURITY DEFINER QR resolver locked down.
revoke all on function public.resolve_tag_by_uuid(text) from public;
grant execute on function public.resolve_tag_by_uuid(text) to anon, authenticated;
