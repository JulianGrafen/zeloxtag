-- ============================================================================
-- ZeloxTag · documents.mileage_km (Kilometerstand auf Rechnungen)
-- Migration: 00010_documents_mileage_km
-- ============================================================================

alter table public.documents
  add column if not exists mileage_km integer null;

comment on column public.documents.mileage_km is
  'Odometer reading from invoice (km), if printed on the document';
