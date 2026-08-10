-- =============================================================================
-- ZeloxTag · Shared ABE Auflagen-Kürzel dictionary
-- Migration: 00032_abe_auflagen_kuerzel
-- =============================================================================
-- Crowd-learned Auflagen code → text mappings for the ABE data hunter.
-- Reads/writes go through authenticated API routes (service role); no direct
-- client table access.
-- =============================================================================

create table if not exists public.abe_auflagen_kuerzel (
  kuerzel text primary key
    check (kuerzel ~ '^[A-Z0-9]{2,6}$'),
  text text not null
    check (char_length(text) >= 8 and char_length(text) <= 8000),
  source text not null default 'learned'
    check (source in ('seed', 'learned', 'manual')),
  learned_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.abe_auflagen_kuerzel is
  'Shared lookup table: ABE Auflagen short codes (744, A02, …) to full legal text.';

create index if not exists abe_auflagen_kuerzel_source_idx
  on public.abe_auflagen_kuerzel using btree (source);

drop trigger if exists abe_auflagen_kuerzel_set_updated_at on public.abe_auflagen_kuerzel;
create trigger abe_auflagen_kuerzel_set_updated_at
  before update on public.abe_auflagen_kuerzel
  for each row
  execute function public.update_updated_at_column();

alter table public.abe_auflagen_kuerzel enable row level security;
alter table public.abe_auflagen_kuerzel force row level security;

revoke all on table public.abe_auflagen_kuerzel from anon;
revoke all on table public.abe_auflagen_kuerzel from authenticated;
