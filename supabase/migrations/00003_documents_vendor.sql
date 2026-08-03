-- =============================================================================
-- ZeloxTag · documents.vendor (Werkstatt / Bauteil)
-- Migration: 00003_documents_vendor
-- =============================================================================

alter table public.documents
  add column if not exists vendor text null;

comment on column public.documents.vendor is
  'For invoices: workshop name. For ABE: optional part name (Bauteil).';
