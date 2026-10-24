-- =============================================================================
-- ZeloxTag · Digital service book (service_records)
-- Migration: 00096_service_records
-- =============================================================================

create table if not exists public.service_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  category text not null check (
    category in (
      'oil_change',
      'brakes_front',
      'brakes_rear',
      'spark_plugs',
      'transmission_fluid',
      'brake_fluid',
      'cabin_filter',
      'air_filter',
      'timing_belt',
      'inspection',
      'tuev',
      'custom'
    )
  ),
  title text not null,
  service_date date not null,
  mileage_km integer not null default 0 check (mileage_km >= 0),
  performed_by text null,
  notes text null,
  invoice_document_id uuid null references public.documents (id) on delete set null,
  next_interval_mileage_km integer null check (
    next_interval_mileage_km is null or next_interval_mileage_km >= 0
  ),
  next_interval_date date null,
  show_on_public_showcase boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists service_records_invoice_document_id_unique_idx
  on public.service_records (invoice_document_id)
  where invoice_document_id is not null;

create index if not exists service_records_vehicle_service_date_idx
  on public.service_records (vehicle_id, service_date desc, created_at desc);

comment on table public.service_records is
  'Owner-maintained digital service book entries; optional link to invoice documents.';

drop trigger if exists service_records_set_updated_at on public.service_records;
create trigger service_records_set_updated_at
  before update on public.service_records
  for each row
  execute function public.update_updated_at_column();

alter table public.service_records enable row level security;
alter table public.service_records force row level security;

revoke all on table public.service_records from anon;
grant select, insert, update, delete on table public.service_records to authenticated;

drop policy if exists "service_records_select_owner" on public.service_records;
drop policy if exists "service_records_insert_owner" on public.service_records;
drop policy if exists "service_records_update_owner" on public.service_records;
drop policy if exists "service_records_delete_owner" on public.service_records;
drop policy if exists "service_records_select_public_showcase" on public.service_records;

create policy "service_records_select_owner" on public.service_records
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.vehicles v
      where v.id = service_records.vehicle_id
        and v.user_id = auth.uid()
    )
  );

create policy "service_records_insert_owner" on public.service_records
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.vehicles v
      where v.id = service_records.vehicle_id
        and v.user_id = auth.uid()
    )
  );

create policy "service_records_update_owner" on public.service_records
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.vehicles v
      where v.id = service_records.vehicle_id
        and v.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.vehicles v
      where v.id = service_records.vehicle_id
        and v.user_id = auth.uid()
    )
  );

create policy "service_records_delete_owner" on public.service_records
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.vehicles v
      where v.id = service_records.vehicle_id
        and v.user_id = auth.uid()
    )
  );

create policy "service_records_select_public_showcase" on public.service_records
  for select
  to anon, authenticated
  using (
    service_records.show_on_public_showcase = true
    and exists (
      select 1
      from public.vehicles v
      where v.id = service_records.vehicle_id
        and v.is_public = true
    )
  );

-- Backfill obvious manual service logs (full OCR history merged at read time until synced).
insert into public.service_records (
  vehicle_id,
  category,
  title,
  service_date,
  mileage_km,
  performed_by,
  notes,
  invoice_document_id,
  show_on_public_showcase
)
select
  d.vehicle_id,
  case
    when d.title ilike '%brems%' then 'brakes_front'
    else 'oil_change'
  end,
  coalesce(nullif(trim(d.title), ''), 'Ölwechsel'),
  coalesce(d.date::date, (d.created_at at time zone 'utc')::date),
  coalesce(d.mileage_km, 0),
  nullif(trim(d.vendor), ''),
  d.notes,
  d.id,
  coalesce(d.show_on_public_showcase, false)
from public.documents d
where d.invoice_number = '__manual__'
  and (
    d.title = 'Ölwechsel'
    or d.title ilike '%ölwechsel%'
    or d.title = 'Bremsen'
    or d.title ilike '%brems%'
  )
on conflict (invoice_document_id) where invoice_document_id is not null do nothing;
