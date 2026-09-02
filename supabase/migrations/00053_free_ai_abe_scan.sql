-- =============================================================================
-- ZeloxTag · One free AI ABE scan per account (freemium hook)
-- Migration: 00053_free_ai_abe_scan
-- =============================================================================

alter table public.user_entitlements
  add column if not exists free_ai_abe_scans_used int not null default 0
    check (free_ai_abe_scans_used >= 0);

comment on column public.user_entitlements.free_ai_abe_scans_used is
  'Complimentary KI ABE scans consumed (1× per account on Free).';

create or replace function public.consume_free_ai_abe_scan(
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

  insert into public.user_entitlements (user_id, free_ai_abe_scans_used)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  update public.user_entitlements
  set free_ai_abe_scans_used = free_ai_abe_scans_used + 1,
      updated_at = timezone('utc', now())
  where user_id = p_user_id
    and free_ai_abe_scans_used < p_limit;

  return found;
end;
$$;

revoke all on function public.consume_free_ai_abe_scan(uuid, int) from public;
grant execute on function public.consume_free_ai_abe_scan(uuid, int) to service_role;
