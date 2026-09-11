-- =============================================================================
-- ZeloxTag · Public showcase engine soundcheck
-- Migration: 00056_vehicle_engine_sound
-- =============================================================================

alter table public.vehicles
  add column if not exists sound_url text null;

comment on column public.vehicles.sound_url is
  'Storage object path for optional public engine soundcheck (mp3/m4a, max 10s).';
