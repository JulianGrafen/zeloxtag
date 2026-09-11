-- =============================================================================
-- ZeloxTag · Engine soundcheck uploads on vehicle-documents
-- Migration: 00057_vehicle_documents_engine_sound_mime
-- =============================================================================
-- Objects: `{vehicle_id}/engine-sound.{mp3|m4a|wav}` (max 2 MB in app logic).
-- =============================================================================

update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/x-wav'
]::text[]
where id = 'vehicle-documents';
