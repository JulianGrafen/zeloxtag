-- =============================================================================
-- ZeloxTag · Two free KI invoice scans on Free (was 1)
-- Migration: 00086_free_invoice_scan_limit_2
-- =============================================================================

create or replace function public.begin_free_scan_session(
  p_user_id uuid,
  p_kind text,
  p_vehicle_id uuid,
  p_session_id uuid default null,
  p_invoice_limit int default 2,
  p_abe_limit int default 1,
  p_fuel_limit int default 3
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
  if p_invoice_limit < 1 or p_abe_limit < 1 or p_fuel_limit < 1 then
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
    v_consumed := public.consume_free_ai_invoice_scan(p_user_id, p_invoice_limit);
  elsif p_kind = 'abe' then
    v_consumed := public.consume_free_ai_abe_scan(p_user_id, p_abe_limit);
  else
    v_consumed := public.consume_free_ai_fuel_scan(p_user_id, p_fuel_limit);
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

revoke all on function public.begin_free_scan_session(uuid, text, uuid, uuid, int, int, int) from public;
grant execute on function public.begin_free_scan_session(uuid, text, uuid, uuid, int, int, int) to service_role;
