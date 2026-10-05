-- Service RPC for weekly leaderboard + email reminder key for rank #1.

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
    or reminder_key like 'maintenance_due:%'
    or reminder_key like 'maintenance_overdue:%'
  );

drop function if exists public.service_weekly_top_builds(int);

create function public.service_weekly_top_builds(p_limit int default 10)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $fn_service_weekly_top_builds$
declare
  v_limit int := least(greatest(coalesce(p_limit, 10), 1), 10);
  v_week_start timestamptz := timezone('utc', now()) - interval '7 days';
  v_rows jsonb;
begin
  select coalesce(jsonb_agg(row_data order by (row_data->>'weekly_likes')::int desc, row_data->>'vehicle_id'), '[]'::jsonb)
    into v_rows
  from (
    select jsonb_build_object(
      'vehicle_id', v.id,
      'weekly_likes', ranked.weekly_likes
    ) as row_data
    from (
      select
        s.vehicle_id,
        count(*)::int as weekly_likes
      from public.showcase_swipes s
      where s.decision = 'like'
        and s.created_at >= v_week_start
      group by s.vehicle_id
      order by count(*) desc, s.vehicle_id
      limit v_limit
    ) ranked
    inner join public.vehicles v on v.id = ranked.vehicle_id
    where v.is_public = true
      and v.showcase_swipe_opt_in = true
      and v.public_slug is not null
  ) sub;

  return v_rows;
end;
$fn_service_weekly_top_builds$;

revoke all on function public.service_weekly_top_builds(int) from public;
grant execute on function public.service_weekly_top_builds(int) to service_role;

comment on function public.service_weekly_top_builds(int) is
  'Rolling 7-day swipe likes leaderboard for service-role emails (no auth.uid()).';
