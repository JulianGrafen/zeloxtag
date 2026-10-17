-- End-of-week awards for swipe leaderboard ranks 1–3 (in-app + email dedupe via user_email_reminders).

create table if not exists public.showcase_weekly_rank_awards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  week_key text not null,
  rank smallint not null check (rank >= 1 and rank <= 3),
  weekly_likes int not null check (weekly_likes >= 1),
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  constraint showcase_weekly_rank_awards_vehicle_week unique (vehicle_id, week_key)
);

create index if not exists showcase_weekly_rank_awards_user_unseen_idx
  on public.showcase_weekly_rank_awards (user_id, seen_at, created_at desc);

alter table public.showcase_weekly_rank_awards enable row level security;
alter table public.showcase_weekly_rank_awards force row level security;

drop policy if exists showcase_weekly_rank_awards_select_own
  on public.showcase_weekly_rank_awards;
create policy showcase_weekly_rank_awards_select_own
  on public.showcase_weekly_rank_awards
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists showcase_weekly_rank_awards_update_seen_own
  on public.showcase_weekly_rank_awards;
create policy showcase_weekly_rank_awards_update_seen_own
  on public.showcase_weekly_rank_awards
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on table public.showcase_weekly_rank_awards from anon;
grant select, update on table public.showcase_weekly_rank_awards to authenticated;

comment on table public.showcase_weekly_rank_awards is
  'Weekly swipe leaderboard top-3 awards; seen_at cleared until owner opens celebration UI.';

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
    or reminder_key like 'weekly_top_build:%'
    or reminder_key like 'weekly_rank_award:%'
    or reminder_key like 'maintenance_due:%'
    or reminder_key like 'maintenance_overdue:%'
  );
