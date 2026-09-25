-- =============================================================================
-- ZeloxTag · Maintenance due schedules (oil + brake) + email reminder keys
-- Migration: 00069_vehicle_maintenance_schedules
-- =============================================================================

create table if not exists public.vehicle_maintenance_schedules (
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  kind text not null check (kind in ('oil_change', 'brake_pads')),
  last_document_id uuid null references public.documents (id) on delete set null,
  last_service_date date not null,
  last_mileage_km integer not null default 0,
  next_due_km integer not null,
  next_due_date date not null,
  part_number text null,
  km_per_day numeric(10, 2) null,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (vehicle_id, kind)
);

create index if not exists vehicle_maintenance_schedules_next_due_idx
  on public.vehicle_maintenance_schedules (next_due_date);

comment on table public.vehicle_maintenance_schedules is
  'Computed next service due dates for cron email reminders (service role writes).';

alter table public.vehicle_maintenance_schedules enable row level security;
alter table public.vehicle_maintenance_schedules force row level security;

revoke all on table public.vehicle_maintenance_schedules from anon, authenticated;

grant select on table public.vehicle_maintenance_schedules to authenticated;

drop policy if exists "vehicle_maintenance_schedules_select_owner" on public.vehicle_maintenance_schedules;
create policy "vehicle_maintenance_schedules_select_owner" on public.vehicle_maintenance_schedules
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.vehicles v
      where v.id = vehicle_maintenance_schedules.vehicle_id
        and v.user_id = auth.uid()
    )
  );

alter table public.user_email_reminders
  drop constraint if exists user_email_reminders_key_check;

alter table public.user_email_reminders
  add constraint user_email_reminders_key_check check (
    reminder_key in (
      'tag_activated_pro_nudge',
      'pro_trial_day_7',
      'pro_trial_day_12',
      'unclaimed_tag_day_3',
      'unclaimed_tag_day_7'
    )
    or reminder_key like 'showcase_like:%'
    or reminder_key like 'maintenance_due:%'
    or reminder_key like 'maintenance_overdue:%'
  );
