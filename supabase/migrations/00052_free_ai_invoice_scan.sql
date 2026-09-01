-- =============================================================================
-- ZeloxTag · One free AI invoice scan per account (freemium hook)
-- Migration: 00052_free_ai_invoice_scan
-- =============================================================================

create table if not exists public.user_entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  free_ai_invoice_scans_used int not null default 0
    check (free_ai_invoice_scans_used >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.user_entitlements is
  'Per-user product entitlements outside paid membership (e.g. one free KI invoice scan).';

drop trigger if exists user_entitlements_set_updated_at on public.user_entitlements;
create trigger user_entitlements_set_updated_at
  before update on public.user_entitlements
  for each row
  execute function public.update_updated_at_column();

alter table public.user_entitlements enable row level security;

-- No direct client access — server uses service role (same pattern as memberships).

create or replace function public.consume_free_ai_invoice_scan(
  p_user_id uuid,
  p_limit int default 1
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

  insert into public.user_entitlements (user_id, free_ai_invoice_scans_used)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  update public.user_entitlements
  set free_ai_invoice_scans_used = free_ai_invoice_scans_used + 1,
      updated_at = timezone('utc', now())
  where user_id = p_user_id
    and free_ai_invoice_scans_used < p_limit;

  return found;
end;
$$;

revoke all on function public.consume_free_ai_invoice_scan(uuid, int) from public;
grant execute on function public.consume_free_ai_invoice_scan(uuid, int) to service_role;
