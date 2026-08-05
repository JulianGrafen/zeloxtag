-- =============================================================================
-- ZeloxTag · ONE-SHOT apply for Supabase SQL Editor
-- Covers: 00017 (contributors) + 00018 (invite fix) + 00019 (invoice SELECT)
-- Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- =============================================================================

-- documents.created_by
alter table public.documents
  add column if not exists created_by uuid references auth.users (id) on delete set null;

create index if not exists documents_created_by_idx
  on public.documents using btree (created_by);

-- vehicle_contributors
create table if not exists public.vehicle_contributors (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  user_id uuid null references auth.users (id) on delete cascade,
  role text not null default 'schrauber'
    check (role in ('schrauber')),
  status text not null default 'invited'
    check (status in ('invited', 'active', 'revoked')),
  invite_token text not null unique,
  label text null,
  invited_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz null,
  revoked_at timestamptz null,
  expires_at timestamptz null,
  constraint vehicle_contributors_active_needs_user check (
    status <> 'active' or user_id is not null
  )
);

create unique index if not exists vehicle_contributors_vehicle_user_active_uidx
  on public.vehicle_contributors (vehicle_id, user_id)
  where user_id is not null and status = 'active';

create index if not exists vehicle_contributors_vehicle_id_idx
  on public.vehicle_contributors using btree (vehicle_id);

create index if not exists vehicle_contributors_user_id_idx
  on public.vehicle_contributors using btree (user_id);

create index if not exists vehicle_contributors_invite_token_idx
  on public.vehicle_contributors using btree (invite_token);

alter table public.vehicle_contributors enable row level security;
alter table public.vehicle_contributors force row level security;

revoke all on table public.vehicle_contributors from anon;
grant select, insert, update on table public.vehicle_contributors to authenticated;
revoke delete on table public.vehicle_contributors from authenticated;

-- Helper used by RLS policies
create or replace function public.is_active_vehicle_contributor(p_vehicle_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.vehicle_contributors c
    where c.vehicle_id = p_vehicle_id
      and c.user_id = auth.uid()
      and c.status = 'active'
  );
$$;

revoke all on function public.is_active_vehicle_contributor(uuid) from public;
grant execute on function public.is_active_vehicle_contributor(uuid) to authenticated;

-- Contributor table policies (NO self-accept — accept via service role + token only)
drop policy if exists "vehicle_contributors_select" on public.vehicle_contributors;
drop policy if exists "vehicle_contributors_insert_owner" on public.vehicle_contributors;
drop policy if exists "vehicle_contributors_update_owner" on public.vehicle_contributors;
drop policy if exists "vehicle_contributors_update_self_accept" on public.vehicle_contributors;

create policy "vehicle_contributors_select" on public.vehicle_contributors
  for select
  to authenticated
  using (
    invited_by = auth.uid()
    or user_id = auth.uid()
    or vehicle_id in (
      select v.id from public.vehicles v where v.user_id = auth.uid()
    )
  );

create policy "vehicle_contributors_insert_owner" on public.vehicle_contributors
  for insert
  to authenticated
  with check (
    invited_by = auth.uid()
    and vehicle_id in (
      select v.id from public.vehicles v where v.user_id = auth.uid()
    )
    and status = 'invited'
  );

create policy "vehicle_contributors_update_owner" on public.vehicle_contributors
  for update
  to authenticated
  using (
    vehicle_id in (
      select v.id from public.vehicles v where v.user_id = auth.uid()
    )
  )
  with check (
    vehicle_id in (
      select v.id from public.vehicles v where v.user_id = auth.uid()
    )
  );

-- vehicles / tags: contributor SELECT
drop policy if exists "vehicles_select_contributor" on public.vehicles;
create policy "vehicles_select_contributor" on public.vehicles
  for select
  to authenticated
  using (public.is_active_vehicle_contributor(id));

drop policy if exists "tags_select_contributor" on public.tags;
create policy "tags_select_contributor" on public.tags
  for select
  to authenticated
  using (
    vehicle_id is not null
    and public.is_active_vehicle_contributor(vehicle_id)
  );

-- documents: Schrauber = invoices only
drop policy if exists "documents_select_contributor" on public.documents;
drop policy if exists "documents_insert_contributor" on public.documents;
drop policy if exists "documents_update_contributor_own" on public.documents;
drop policy if exists "documents_delete_contributor_own" on public.documents;

create policy "documents_select_contributor" on public.documents
  for select
  to authenticated
  using (
    public.is_active_vehicle_contributor(vehicle_id)
    and type = 'invoice'
  );

create policy "documents_insert_contributor" on public.documents
  for insert
  to authenticated
  with check (
    public.is_active_vehicle_contributor(vehicle_id)
    and type = 'invoice'
    and created_by = auth.uid()
  );

create policy "documents_update_contributor_own" on public.documents
  for update
  to authenticated
  using (
    public.is_active_vehicle_contributor(vehicle_id)
    and created_by = auth.uid()
    and type = 'invoice'
  )
  with check (
    public.is_active_vehicle_contributor(vehicle_id)
    and created_by = auth.uid()
    and type = 'invoice'
  );

create policy "documents_delete_contributor_own" on public.documents
  for delete
  to authenticated
  using (
    public.is_active_vehicle_contributor(vehicle_id)
    and created_by = auth.uid()
    and type = 'invoice'
  );
