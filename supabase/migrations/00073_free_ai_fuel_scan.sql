-- =============================================================================
-- ZeloxTag · Free KI fuel receipt scans (3× per account on Free)
-- Migration: 00073_free_ai_fuel_scan
-- =============================================================================

alter table public.user_entitlements
  add column if not exists free_ai_fuel_scans_used int not null default 0
    check (free_ai_fuel_scans_used >= 0);

comment on column public.user_entitlements.free_ai_fuel_scans_used is
  'Complimentary KI tank receipt scans consumed on Free tier.';

create or replace function public.consume_free_ai_fuel_scan(
  p_user_id uuid,
  p_limit int default 3
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_limit < 1 then
    return false;
  end if;

  insert into public.user_entitlements (user_id, free_ai_fuel_scans_used)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  update public.user_entitlements
  set free_ai_fuel_scans_used = free_ai_fuel_scans_used + 1,
      updated_at = timezone('utc', now())
  where user_id = p_user_id
    and free_ai_fuel_scans_used < p_limit;

  return found;
end;
$$;

revoke all on function public.consume_free_ai_fuel_scan(uuid, int) from public;
grant execute on function public.consume_free_ai_fuel_scan(uuid, int) to service_role;

alter table public.free_scan_sessions
  drop constraint if exists free_scan_sessions_scan_kind_check;

alter table public.free_scan_sessions
  add constraint free_scan_sessions_scan_kind_check
  check (scan_kind in ('invoice', 'abe', 'fuel'));

create or replace function public.validate_free_scan_session(
  p_session_id uuid,
  p_user_id uuid,
  p_vehicle_id uuid,
  p_kind text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_session_id is null or p_user_id is null or p_vehicle_id is null then
    return false;
  end if;
  if p_kind not in ('invoice', 'abe', 'fuel') then
    return false;
  end if;

  return exists (
    select 1
    from public.free_scan_sessions s
    where s.id = p_session_id
      and s.user_id = p_user_id
      and s.vehicle_id = p_vehicle_id
      and s.scan_kind = p_kind
      and s.expires_at > timezone('utc', now())
  );
end;
$$;

create or replace function public.begin_free_scan_session(
  p_user_id uuid,
  p_kind text,
  p_vehicle_id uuid,
  p_session_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_consumed boolean;
begin
  if p_user_id is null or p_vehicle_id is null then
    return null;
  end if;
  if p_kind not in ('invoice', 'abe', 'fuel') then
    return null;
  end if;

  if p_session_id is not null then
    if public.validate_free_scan_session(
      p_session_id,
      p_user_id,
      p_vehicle_id,
      p_kind
    ) then
      return p_session_id;
    end if;
    return null;
  end if;

  if p_kind = 'invoice' then
    v_consumed := public.consume_free_ai_invoice_scan(p_user_id, 1);
  elsif p_kind = 'abe' then
    v_consumed := public.consume_free_ai_abe_scan(p_user_id, 1);
  else
    v_consumed := public.consume_free_ai_fuel_scan(p_user_id, 3);
  end if;

  if not v_consumed then
    return null;
  end if;

  insert into public.free_scan_sessions (user_id, scan_kind, vehicle_id)
  values (p_user_id, p_kind, p_vehicle_id)
  returning id into v_session_id;

  return v_session_id;
end;
$$;
