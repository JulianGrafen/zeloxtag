-- Cached LLM/heuristic "Build DNA" for public showcase radar (Power/Handling/Style/Reliability).

alter table public.vehicles
  add column if not exists showcase_build_dna jsonb,
  add column if not exists showcase_build_dna_fingerprint text,
  add column if not exists showcase_build_dna_updated_at timestamptz;

comment on column public.vehicles.showcase_build_dna is
  'Public showcase Build DNA: archetype, radar scores, punchline (JSON).';
comment on column public.vehicles.showcase_build_dna_fingerprint is
  'Hash of public mod list; skip LLM when unchanged.';
comment on column public.vehicles.showcase_build_dna_updated_at is
  'When showcase_build_dna was last computed.';
