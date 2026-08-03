-- =============================================================================
-- ZeloxTag · documents.line_items (OCR line positions)
-- Migration: 00005_documents_line_items
-- =============================================================================

alter table public.documents
  add column if not exists line_items jsonb null;

comment on column public.documents.line_items is
  'OCR invoice positions: [{ "label": string, "amount": number }]';
