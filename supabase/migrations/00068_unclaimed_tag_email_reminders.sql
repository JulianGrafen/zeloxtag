-- =============================================================================
-- ZeloxTag · Unclaimed tag activation reminder emails (Resend cron)
-- Migration: 00068_unclaimed_tag_email_reminders
-- =============================================================================

alter table public.user_email_reminders
  drop constraint if exists user_email_reminders_key_check;

alter table public.user_email_reminders
  add constraint user_email_reminders_key_check check (
    reminder_key in (
      'tag_activated_pro_nudge',
      'pro_trial_day_7',
      'pro_trial_day_12',
      'unclaimed_tag_day_3',
      'unclaimed_tag_day_7'
    )
    or reminder_key like 'showcase_like:%'
  );

comment on constraint user_email_reminders_key_check on public.user_email_reminders is
  'Allowed one-shot reminder keys; showcase_like:{vehicle_id} for throttled like notifications.';
