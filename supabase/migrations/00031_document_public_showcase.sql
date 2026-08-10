-- =============================================================================
-- ZeloxTag · Per-document public showcase visibility
-- Migration: 00031_document_public_showcase
-- =============================================================================

alter table public.documents
  add column if not exists show_on_public_showcase boolean not null default false;

comment on column public.documents.show_on_public_showcase is
  'When true, invoice line items / manual tuning entry appear on the public showcase.';
