-- =============================================================================
-- ZeloxTag · Cap digital-garage onboarding (e.g. first 15 beta testers)
-- Migration: 00075_digital_garage_beta_cap
--
-- Applies ONLY to public.create_garage_vehicle (PWA /register, /onboarding/fahrzeug).
-- Physical tag claim (/v/{tag}, complete-claim RPCs) is unlimited and does not
-- touch digital_garage_beta_enrollments.
-- =============================================================================

create table if not exists public.platform_config (
  key text primary key,
  value_int integer,
  updated_at timestamptz not null default now()
);

comment on table public.platform_config is
  'Operator-tunable limits. NULL value_int = feature off for keyed limits.';

insert into public.platform_config (key, value_int)
values ('digital_garage_beta_max', 15)
on conflict (key) do update
  set value_int = excluded.value_int,
      updated_at = now();

create table if not exists public.digital_garage_beta_enrollments (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.digital_garage_beta_enrollments is
  'One row per user who consumed a digital-garage beta slot (create_garage_vehicle).';

alter table public.digital_garage_beta_enrollments enable row level security;

create or replace function public.digital_garage_beta_status()
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_uid uuid := auth.uid();
  v_max integer;
  v_used integer;
  v_enrolled boolean := false;
begin
  select value_int
    into v_max
  from public.platform_config
  where key = 'digital_garage_beta_max';

  if v_max is null or v_max < 0 then
    return jsonb_build_object('limited', false);
  end if;

  select count(*)::integer
    into v_used
  from public.digital_garage_beta_enrollments;

  if v_uid is not null then
    select exists (
      select 1
      from public.digital_garage_beta_enrollments e
      where e.user_id = v_uid
    )
    into v_enrolled;
  end if;

  return jsonb_build_object(
    'limited', true,
    'max_slots', v_max,
    'used_slots', v_used,
    'remaining', greatest(0, v_max - v_used),
    'full', (v_used >= v_max and not v_enrolled),
    'enrolled', v_enrolled
  );
end;
$$;

revoke all on function public.digital_garage_beta_status() from public;
grant execute on function public.digital_garage_beta_status() to anon, authenticated;

create or replace function public.create_garage_vehicle(
  p_make text,
  p_model text,
  p_year integer,
  p_vin text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_uid uuid := auth.uid();
  v_vehicle_id uuid;
  v_max integer;
  v_used integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated');
  end if;

  select value_int
    into v_max
  from public.platform_config
  where key = 'digital_garage_beta_max';

  if v_max is not null and v_max >= 0 then
    if not exists (
      select 1
      from public.digital_garage_beta_enrollments e
      where e.user_id = v_uid
    ) then
      perform pg_advisory_xact_lock(915_074_001);

      select count(*)::integer
        into v_used
      from public.digital_garage_beta_enrollments;

      if v_used >= v_max then
        return jsonb_build_object('ok', false, 'error', 'beta_full');
      end if;
    end if;
  end if;

  if p_make is null or btrim(p_make) = ''
     or p_model is null or btrim(p_model) = ''
     or p_year is null then
    return jsonb_build_object('ok', false, 'error', 'unavailable');
  end if;

  if p_year < 1900 or p_year > 2100 then
    return jsonb_build_object('ok', false, 'error', 'unavailable');
  end if;

  insert into public.vehicles (user_id, make, model, year, vin)
  values (
    v_uid,
    btrim(p_make),
    btrim(p_model),
    p_year,
    nullif(btrim(coalesce(p_vin, '')), '')
  )
  returning id into v_vehicle_id;

  if v_max is not null and v_max >= 0 then
    insert into public.digital_garage_beta_enrollments (user_id)
    values (v_uid)
    on conflict (user_id) do nothing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'vehicle_id', v_vehicle_id
  );
exception
  when others then
    return jsonb_build_object('ok', false, 'error', 'unavailable');
end;
$$;

notify pgrst, 'reload schema';
