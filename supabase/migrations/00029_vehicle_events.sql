-- =============================================================================
-- ZeloxTag · vehicle_events (mileage-ordered Service & History Timeline)
-- Migration: 00029_vehicle_events
-- =============================================================================

create table if not exists public.vehicle_events (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  mileage integer not null
    check (mileage >= 0 and mileage <= 9999999),
  date date not null,
  category text not null
    check (
      category in (
        'oil_change',
        'repair',
        'inspection',
        'part_install',
        'tuev',
        'other'
      )
    ),
  title text not null,
  description text null,
  cost numeric(10, 2) null
    check (cost is null or cost >= 0),
  document_id uuid null references public.documents (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint vehicle_events_title_nonempty check (char_length(trim(title)) > 0)
);

create index if not exists vehicle_events_vehicle_id_mileage_idx
  on public.vehicle_events using btree (vehicle_id, mileage desc);

create index if not exists vehicle_events_document_id_idx
  on public.vehicle_events using btree (document_id)
  where document_id is not null;

comment on table public.vehicle_events is
  'Mileage-ordered vehicle milestones (oil, repair, TÜV, parts) for the Service Timeline.';

drop trigger if exists vehicle_events_set_updated_at on public.vehicle_events;
create trigger vehicle_events_set_updated_at
  before update on public.vehicle_events
  for each row
  execute function public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- RLS: owner CRUD; Schrauber with history read may SELECT
-- -----------------------------------------------------------------------------
alter table public.vehicle_events enable row level security;
alter table public.vehicle_events force row level security;

drop policy if exists "vehicle_events_select_owner" on public.vehicle_events;
drop policy if exists "vehicle_events_insert_owner" on public.vehicle_events;
drop policy if exists "vehicle_events_update_owner" on public.vehicle_events;
drop policy if exists "vehicle_events_delete_owner" on public.vehicle_events;
drop policy if exists "vehicle_events_select_contributor" on public.vehicle_events;

create policy "vehicle_events_select_owner" on public.vehicle_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.vehicles v
      where v.id = vehicle_events.vehicle_id
        and v.user_id = auth.uid()
    )
  );

create policy "vehicle_events_insert_owner" on public.vehicle_events
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.vehicles v
      where v.id = vehicle_events.vehicle_id
        and v.user_id = auth.uid()
    )
  );

create policy "vehicle_events_update_owner" on public.vehicle_events
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.vehicles v
      where v.id = vehicle_events.vehicle_id
        and v.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.vehicles v
      where v.id = vehicle_events.vehicle_id
        and v.user_id = auth.uid()
    )
  );

create policy "vehicle_events_delete_owner" on public.vehicle_events
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.vehicles v
      where v.id = vehicle_events.vehicle_id
        and v.user_id = auth.uid()
    )
  );

create policy "vehicle_events_select_contributor" on public.vehicle_events
  for select
  to authenticated
  using (
    public.is_active_vehicle_contributor(vehicle_id)
    and public.contributor_can_read_vehicle_history(vehicle_id)
  );
