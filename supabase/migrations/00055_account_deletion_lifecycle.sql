-- =============================================================================
-- ZeloxTag · Account deletion lifecycle (Datenschutz §5)
-- Migration: 00055_account_deletion_lifecycle
-- =============================================================================
-- Voluntary account deletion: 30-day read-only grace, then hard purge via cron.
-- Writes: service role only. Users may SELECT their own row.
-- =============================================================================

create table if not exists public.account_deletion_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null
    check (status in ('grace', 'canceled', 'completed')),
  requested_at timestamptz not null default timezone('utc', now()),
  grace_ends_at timestamptz not null,
  canceled_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.account_deletion_requests is
  'Voluntary account deletion grace window before hard purge.';

create unique index if not exists account_deletion_requests_active_user_idx
  on public.account_deletion_requests (user_id)
  where status = 'grace';

create index if not exists account_deletion_requests_grace_due_idx
  on public.account_deletion_requests (grace_ends_at)
  where status = 'grace';

drop trigger if exists account_deletion_requests_set_updated_at
  on public.account_deletion_requests;
create trigger account_deletion_requests_set_updated_at
  before update on public.account_deletion_requests
  for each row
  execute function public.update_updated_at_column();

create table if not exists public.account_data_subject_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null
    check (event_type in (
      'deletion_requested',
      'deletion_canceled',
      'export_downloaded',
      'purge_completed'
    )),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.account_data_subject_log is
  'DSR audit log for account deletion and data export events.';

create index if not exists account_data_subject_log_user_id_idx
  on public.account_data_subject_log (user_id, created_at desc);

alter table public.account_deletion_requests enable row level security;
alter table public.account_deletion_requests force row level security;
alter table public.account_data_subject_log enable row level security;
alter table public.account_data_subject_log force row level security;

revoke all on table public.account_deletion_requests from anon, authenticated;
revoke all on table public.account_data_subject_log from anon, authenticated;

grant select on table public.account_deletion_requests to authenticated;
grant select on table public.account_data_subject_log to authenticated;

drop policy if exists "account_deletion_requests_select_own"
  on public.account_deletion_requests;
create policy "account_deletion_requests_select_own"
  on public.account_deletion_requests
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "account_data_subject_log_select_own"
  on public.account_data_subject_log;
create policy "account_data_subject_log_select_own"
  on public.account_data_subject_log
  for select
  to authenticated
  using (auth.uid() = user_id);
