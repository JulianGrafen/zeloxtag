-- ============================================================================
-- ZeloxTag · documents.technical_specs (ABE technische Maße)
-- Migration: 00011_documents_technical_specs
-- ============================================================================

alter table public.documents
  add column if not exists technical_specs jsonb null;

comment on column public.documents.technical_specs is
  'ABE technical dimensions/specs as JSON array of {label, value}';
