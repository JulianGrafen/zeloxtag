-- =============================================================================
-- ZeloxTag · Free-scan sessions — consume quota at OCR start, reuse in wizard
-- Migration: 00054_free_scan_sessions
-- =============================================================================

create table if not exists public.free_scan_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scan_kind text not null check (scan_kind in ('invoice', 'abe')),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default (timezone('utc', now()) + interval '30 minutes')
);

create index if not exists free_scan_sessions_user_kind_idx
  on public.free_scan_sessions (user_id, scan_kind, expires_at desc);

comment on table public.free_scan_sessions is
  'Short-lived OCR wizard sessions; quota consumed once when session begins.';

alter table public.free_scan_sessions enable row level security;
alter table public.free_scan_sessions force row level security;

revoke all on table public.free_scan_sessions from anon, authenticated;

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
  if p_kind not in ('invoice', 'abe') then
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
  if p_kind not in ('invoice', 'abe') then
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
  else
    v_consumed := public.consume_free_ai_abe_scan(p_user_id, 1);
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

revoke all on function public.validate_free_scan_session(uuid, uuid, uuid, text) from public;
revoke all on function public.begin_free_scan_session(uuid, text, uuid, uuid) from public;

grant execute on function public.validate_free_scan_session(uuid, uuid, uuid, text) to service_role;
grant execute on function public.begin_free_scan_session(uuid, text, uuid, uuid) to service_role;
