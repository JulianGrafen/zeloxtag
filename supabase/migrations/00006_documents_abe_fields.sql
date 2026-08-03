-- =============================================================================
-- ZeloxTag · ABE fields (KBA number + vehicle approvals)
-- Migration: 00006_documents_abe_fields
-- =============================================================================

alter table public.documents
  add column if not exists kba_number text null;

alter table public.documents
  add column if not exists vehicle_approvals jsonb null;

comment on column public.documents.kba_number is
  'ABE / Teilegutachten approval number (KBA / ABE-Nr.)';

comment on column public.documents.vehicle_approvals is
  'ABE vehicle fitment list: ["Mazda RX-8", ...]';
