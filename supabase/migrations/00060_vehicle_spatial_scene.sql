-- =============================================================================
-- ZeloxTag · Public showcase spatial scene layers (depth bands)
-- Migration: 00060_vehicle_spatial_scene
-- =============================================================================

alter table public.vehicles
  add column if not exists spatial_scene jsonb null;

comment on column public.vehicles.spatial_scene is
  'Generated far→near PNG layer paths in vehicle-silhouettes for public spatial scroll parallax.';
