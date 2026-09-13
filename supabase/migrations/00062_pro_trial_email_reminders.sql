-- =============================================================================
-- ZeloxTag · Pro trial & tag activation email reminders (Resend cron)
-- Migration: 00062_pro_trial_email_reminders
-- =============================================================================

alter table public.memberships
  add column if not exists trial_started_at timestamptz null,
  add column if not exists trial_ends_at timestamptz null;

comment on column public.memberships.trial_started_at is
  'UTC anchor for day-7 / day-12 Pro trial reminder emails (Stripe trialing).';
comment on column public.memberships.trial_ends_at is
  'Stripe subscription trial_end — skip reminders after trial converts or ends.';

create table if not exists public.user_email_reminders (
  user_id uuid not null references auth.users (id) on delete cascade,
  reminder_key text not null,
  sent_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, reminder_key),
  constraint user_email_reminders_key_check check (
    reminder_key in (
      'tag_activated_pro_nudge',
      'pro_trial_day_7',
      'pro_trial_day_12'
    )
  )
);

comment on table public.user_email_reminders is
  'One-shot transactional reminders sent via Resend (service role only).';

alter table public.user_email_reminders enable row level security;
alter table public.user_email_reminders force row level security;

revoke all on table public.user_email_reminders from anon, authenticated;

create index if not exists memberships_trial_started_at_idx
  on public.memberships (trial_started_at)
  where trial_started_at is not null and billing_provider = 'stripe';
