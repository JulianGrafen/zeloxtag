-- =============================================================================
-- ZeloxTag · Private vehicle-silhouettes (C6)
-- Migration: 00050_private_vehicle_silhouettes
-- =============================================================================
-- Header photos are delivered via `/api/vehicle/silhouette/[vehicleId]`
-- (session / public-showcase / exposé). The bucket must not stay world-readable.
-- =============================================================================

update storage.buckets
set public = false
where id = 'vehicle-silhouettes';

drop policy if exists "vehicle_silhouettes_public_read" on storage.objects;
