-- =============================================================================
-- ZeloxTag · ABE detail fields (authority, conditions, part category, notes, pages)
-- Migration: 00007_documents_abe_detail
-- =============================================================================

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

comment on column public.documents.authority is
  'ABE issuing authority (e.g. KBA / Hersteller)';

comment on column public.documents.conditions is
  'ABE Auflagen as JSON string array';

comment on column public.documents.part_category is
  'ABE part category label (Aerodynamik, Räder, Fahrwerk, …)';

comment on column public.documents.notes is
  'Longer freigabe / summary text for ABE detail';

comment on column public.documents.page_count is
  'Number of PDF pages at upload time';
