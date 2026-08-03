-- =============================================================================
-- ZeloxTag · documents.category (OCR category, e.g. service / repair)
-- Migration: 00004_documents_category
-- =============================================================================

alter table public.documents
  add column if not exists category text null;

comment on column public.documents.category is
  'OCR app category: tuning | service | tuev | repair | abe | other';
