-- ============================================================================
-- ZeloxTag · documents.invoice_number
-- Migration: 00009_documents_invoice_number
-- ============================================================================

alter table public.documents
  add column if not exists invoice_number text null;

comment on column public.documents.invoice_number is
  'Invoice / Beleg number (e.g. RE-2026-0312)';
