-- =============================================================================
-- ZeloxTag · MFA recovery codes
-- Migration: 00020_mfa_recovery_codes
-- =============================================================================
-- Hashed one-time codes for authenticator loss. No authenticated RLS policies —
-- only the service-role app path may read/write (fail closed for clients).
-- =============================================================================

create table if not exists public.mfa_recovery_codes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code_hash text not null,
  created_at timestamptz not null default timezone('utc', now()),
  used_at timestamptz null,
  constraint mfa_recovery_codes_hash_unique unique (code_hash)
);

create index if not exists mfa_recovery_codes_user_id_idx
  on public.mfa_recovery_codes using btree (user_id);

create index if not exists mfa_recovery_codes_user_unused_idx
  on public.mfa_recovery_codes using btree (user_id)
  where used_at is null;

alter table public.mfa_recovery_codes enable row level security;
alter table public.mfa_recovery_codes force row level security;

revoke all on table public.mfa_recovery_codes from anon;
revoke all on table public.mfa_recovery_codes from authenticated;
grant all on table public.mfa_recovery_codes to service_role;
-- service_role bypasses RLS; no grants to authenticated/anon.
