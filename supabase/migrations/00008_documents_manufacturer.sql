-- =============================================================================
-- ZeloxTag · documents.manufacturer (ABE Hersteller)
-- Migration: 00008_documents_manufacturer
-- =============================================================================

alter table public.documents
  add column if not exists manufacturer text null;

comment on column public.documents.manufacturer is
  'ABE part manufacturer / brand (e.g. AutoExe, Milltek, OZ)';
