-- =============================================================================
-- ZeloxTag · Schrauber may or may not read existing invoice history
-- Migration: 00022_contributor_read_history
-- =============================================================================
-- Owner toggle: can_read_history
--   true  → see all invoices on the vehicle (current behavior)
--   false → only own uploads (scan / write-only)
-- =============================================================================

alter table public.vehicle_contributors
  add column if not exists can_read_history boolean not null default true;

comment on column public.vehicle_contributors.can_read_history is
  'When true, active Schrauber may SELECT all invoices; when false, only own created_by rows.';

create or replace function public.contributor_can_read_vehicle_history(
  p_vehicle_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.vehicle_contributors c
    where c.vehicle_id = p_vehicle_id
      and c.user_id = auth.uid()
      and c.status = 'active'
      and c.can_read_history = true
  );
$$;

revoke all on function public.contributor_can_read_vehicle_history(uuid) from public;
grant execute on function public.contributor_can_read_vehicle_history(uuid)
  to authenticated;

drop policy if exists "documents_select_contributor" on public.documents;

create policy "documents_select_contributor" on public.documents
  for select
  to authenticated
  using (
    public.is_active_vehicle_contributor(vehicle_id)
    and type = 'invoice'
    and (
      created_by = auth.uid()
      or public.contributor_can_read_vehicle_history(vehicle_id)
    )
  );
