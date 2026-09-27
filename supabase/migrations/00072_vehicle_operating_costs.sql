-- =============================================================================
-- ZeloxTag · Operating costs (fuel, insurance, tax, other)
-- Migration: 00072_vehicle_operating_costs
-- =============================================================================

create table if not exists public.vehicle_operating_costs (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (category in ('fuel', 'insurance', 'tax', 'other')),
  amount_eur numeric(10, 2) not null check (amount_eur > 0),
  occurred_on date not null,
  billing_period text not null default 'once'
    check (billing_period in ('once', 'monthly', 'yearly')),
  note text null,
  fuel_liters numeric(10, 2) null check (fuel_liters is null or fuel_liters > 0),
  odometer_km integer null check (odometer_km is null or odometer_km >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists vehicle_operating_costs_vehicle_occurred_idx
  on public.vehicle_operating_costs (vehicle_id, occurred_on desc);

comment on table public.vehicle_operating_costs is
  'Owner-entered running costs (fuel, insurance, tax) for monthly averages.';

drop trigger if exists vehicle_operating_costs_set_updated_at on public.vehicle_operating_costs;
create trigger vehicle_operating_costs_set_updated_at
  before update on public.vehicle_operating_costs
  for each row
  execute function public.update_updated_at_column();

alter table public.vehicle_operating_costs enable row level security;
alter table public.vehicle_operating_costs force row level security;

revoke all on table public.vehicle_operating_costs from anon;
grant select, insert, update, delete on table public.vehicle_operating_costs to authenticated;

drop policy if exists "vehicle_operating_costs_select_owner" on public.vehicle_operating_costs;
drop policy if exists "vehicle_operating_costs_insert_owner" on public.vehicle_operating_costs;
drop policy if exists "vehicle_operating_costs_update_owner" on public.vehicle_operating_costs;
drop policy if exists "vehicle_operating_costs_delete_owner" on public.vehicle_operating_costs;

create policy "vehicle_operating_costs_select_owner" on public.vehicle_operating_costs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.vehicles v
      where v.id = vehicle_operating_costs.vehicle_id
        and v.user_id = auth.uid()
    )
  );

create policy "vehicle_operating_costs_insert_owner" on public.vehicle_operating_costs
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.vehicles v
      where v.id = vehicle_operating_costs.vehicle_id
        and v.user_id = auth.uid()
    )
  );

create policy "vehicle_operating_costs_update_owner" on public.vehicle_operating_costs
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.vehicles v
      where v.id = vehicle_operating_costs.vehicle_id
        and v.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.vehicles v
      where v.id = vehicle_operating_costs.vehicle_id
        and v.user_id = auth.uid()
    )
  );

create policy "vehicle_operating_costs_delete_owner" on public.vehicle_operating_costs
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.vehicles v
      where v.id = vehicle_operating_costs.vehicle_id
        and v.user_id = auth.uid()
    )
  );
