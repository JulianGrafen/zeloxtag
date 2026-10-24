-- =============================================================================
-- ZeloxTag · Expand maintenance schedule kinds for service book categories
-- Migration: 00097_maintenance_schedule_kinds
-- =============================================================================

alter table public.vehicle_maintenance_schedules
  drop constraint if exists vehicle_maintenance_schedules_kind_check;

alter table public.vehicle_maintenance_schedules
  add constraint vehicle_maintenance_schedules_kind_check check (
    kind in (
      'oil_change',
      'brake_pads',
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
  );
