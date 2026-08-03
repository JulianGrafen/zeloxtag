-- =============================================================================
-- ZeloxTag · Ensure all ABE persistence columns exist
-- Migration: 00011_documents_abe_columns_ensure
-- Idempotent catch-up if 00006–00010 were only partially applied.
-- =============================================================================

alter table public.documents
  add column if not exists vendor text null;

alter table public.documents
  add column if not exists category text null;

alter table public.documents
  add column if not exists line_items jsonb null;

alter table public.documents
  add column if not exists kba_number text null;

alter table public.documents
  add column if not exists vehicle_approvals jsonb null;

alter table public.documents
  add column if not exists authority text null;

alter table public.documents
  add column if not exists conditions jsonb null;

alter table public.documents
  add column if not exists part_category text null;

alter table public.documents
  add column if not exists notes text null;

alter table public.documents
  add column if not exists page_count integer null;

alter table public.documents
  add column if not exists manufacturer text null;

alter table public.documents
  add column if not exists invoice_number text null;

alter table public.documents
  add column if not exists mileage_km integer null;

comment on column public.documents.kba_number is
  'ABE / Teilegutachten approval number (KBA / ABE-Nr.)';

comment on column public.documents.vehicle_approvals is
  'ABE Fahrzeugfreigaben (make + model) as JSON string array';

comment on column public.documents.conditions is
  'ABE Auflagen as JSON string array (full wording)';

comment on column public.documents.manufacturer is
  'ABE part manufacturer / brand (e.g. AutoExe, Milltek, OZ)';
