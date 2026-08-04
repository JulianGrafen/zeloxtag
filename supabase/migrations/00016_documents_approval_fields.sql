-- ZeloxTag · documents.approval_fields (structured Gutachten / TÜV payloads)
-- Migration: 00016_documents_approval_fields
-- Discriminated JSON: { kind, data? } for teilegutachten | einzelabnahme | egbe | tuev | abe

alter table public.documents
  add column if not exists approval_fields jsonb null;

comment on column public.documents.approval_fields is
  'Structured approval/inspection payload: { kind: abe|teilegutachten|einzelabnahme|egbe|tuev, data?: object }. type stays abe|tuev.';
