-- =============================================================================
-- ZeloxTag · Initial production schema
-- Migration: 00001_initial_schema
-- =============================================================================
-- Goals:
--   • Clean, modular multi-tenant vehicle / tag / document model
--   • Instant QR lookup via tags.uuid
--   • Strict RLS for owner writes; public tag SELECT for physical scans
--   • SECURITY DEFINER resolver for anonymous active-tag digital twin reads
--     (keeps base table policies owner-scoped while enabling QR product UX)
-- =============================================================================

create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------------------------
-- Helper: keep updated_at fresh on every row change
-- -----------------------------------------------------------------------------
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- vehicles
-- -----------------------------------------------------------------------------
create table if not exists public.vehicles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  make text not null,
  model text not null,
  year integer null
    check (year is null or (year >= 1900 and year <= 2100)),
  vin text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists vehicles_user_id_idx
  on public.vehicles using btree (user_id);

drop trigger if exists vehicles_set_updated_at on public.vehicles;
create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row
  execute function public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- tags (physical stainless steel QR plaques)
-- -----------------------------------------------------------------------------
create table if not exists public.tags (
  id uuid primary key default uuid_generate_v4(),
  uuid text not null unique,
  vehicle_id uuid null references public.vehicles (id) on delete set null,
  status text not null default 'unclaimed'
    check (status in ('unclaimed', 'active')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tags_status_vehicle_consistency check (
    (status = 'unclaimed' and vehicle_id is null)
    or (status = 'active' and vehicle_id is not null)
  )
);

create index if not exists tags_uuid_idx
  on public.tags using btree (uuid);

create index if not exists tags_vehicle_id_idx
  on public.tags using btree (vehicle_id);

drop trigger if exists tags_set_updated_at on public.tags;
create trigger tags_set_updated_at
  before update on public.tags
  for each row
  execute function public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- documents (ABEs, invoices, TÜV, misc)
-- -----------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  title text not null,
  type text not null default 'other'
    check (type in ('abe', 'invoice', 'tuev', 'other')),
  file_url text not null,
  amount numeric(10, 2) null,
  date date null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists documents_vehicle_id_idx
  on public.documents using btree (vehicle_id);

create index if not exists documents_vehicle_id_created_at_idx
  on public.documents using btree (vehicle_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.vehicles enable row level security;
alter table public.tags enable row level security;
alter table public.documents enable row level security;

-- vehicles: owner-only CRUD
drop policy if exists "vehicles_select_own" on public.vehicles;
drop policy if exists "vehicles_insert_own" on public.vehicles;
drop policy if exists "vehicles_update_own" on public.vehicles;
drop policy if exists "vehicles_delete_own" on public.vehicles;

create policy "vehicles_select_own" on public.vehicles
  for select
  using (auth.uid() = user_id);

create policy "vehicles_insert_own" on public.vehicles
  for insert
  with check (auth.uid() = user_id);

create policy "vehicles_update_own" on public.vehicles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "vehicles_delete_own" on public.vehicles
  for delete
  using (auth.uid() = user_id);

-- tags: public SELECT for QR scans; claim + owner UPDATE only
drop policy if exists "tags_select_public" on public.tags;
drop policy if exists "tags_claim_unclaimed" on public.tags;
drop policy if exists "tags_update_owner" on public.tags;

create policy "tags_select_public" on public.tags
  for select
  using (true);

-- Authenticated user claims an unclaimed tag onto a vehicle they own
create policy "tags_claim_unclaimed" on public.tags
  for update
  using (
    status = 'unclaimed'
    and auth.uid() is not null
  )
  with check (
    status = 'active'
    and vehicle_id is not null
    and vehicle_id in (
      select v.id from public.vehicles v where v.user_id = auth.uid()
    )
  );

-- Owner may update tags already linked to their vehicles
create policy "tags_update_owner" on public.tags
  for update
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

-- documents: owner-only CRUD via vehicles join
drop policy if exists "documents_select_own" on public.documents;
drop policy if exists "documents_insert_own" on public.documents;
drop policy if exists "documents_update_own" on public.documents;
drop policy if exists "documents_delete_own" on public.documents;
drop policy if exists "documents_select_active_tagged" on public.documents;

create policy "documents_select_own" on public.documents
  for select
  using (
    vehicle_id in (
      select v.id from public.vehicles v where v.user_id = auth.uid()
    )
  );

create policy "documents_insert_own" on public.documents
  for insert
  with check (
    vehicle_id in (
      select v.id from public.vehicles v where v.user_id = auth.uid()
    )
  );

create policy "documents_update_own" on public.documents
  for update
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

create policy "documents_delete_own" on public.documents
  for delete
  using (
    vehicle_id in (
      select v.id from public.vehicles v where v.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- Public QR scan resolver (SECURITY DEFINER)
-- -----------------------------------------------------------------------------
-- Direct table RLS keeps vehicles/documents private to owners.
-- This function intentionally elevates for the scan path only, returning the
-- minimal digital-twin payload for a known tag uuid.
create or replace function public.resolve_tag_by_uuid(p_uuid text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tag public.tags%rowtype;
  v_vehicle jsonb;
  v_documents jsonb;
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
    select to_jsonb(v)
      into v_vehicle
    from public.vehicles v
    where v.id = v_tag.vehicle_id;

    select coalesce(jsonb_agg(to_jsonb(d) order by d.created_at desc), '[]'::jsonb)
      into v_documents
    from public.documents d
    where d.vehicle_id = v_tag.vehicle_id;
  else
    v_vehicle := null;
    v_documents := '[]'::jsonb;
  end if;

  return jsonb_build_object(
    'tag', to_jsonb(v_tag),
    'vehicle', v_vehicle,
    'documents', v_documents
  );
end;
$$;

revoke all on function public.resolve_tag_by_uuid(text) from public;
grant execute on function public.resolve_tag_by_uuid(text) to anon, authenticated;
