-- =============================================================================
-- ZeloxTag · Smart Build Planner (planned mods + build todos)
-- Migration: 00077_planned_mods_build_todos
-- =============================================================================

create table if not exists public.planned_mods (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active'
    check (status in ('draft', 'active', 'completed', 'archived')),
  title text not null check (char_length(trim(title)) >= 2),
  manufacturer text null,
  category text null,
  planned_price_eur numeric(10, 2) null
    check (planned_price_eur is null or planned_price_eur >= 0),
  source_url text null,
  source_kind text not null default 'manual'
    check (source_kind in ('link', 'image', 'text', 'manual')),
  source_payload jsonb null,
  ai_model text null,
  document_id uuid null references public.documents (id) on delete set null,
  completed_at timestamptz null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists planned_mods_vehicle_status_sort_idx
  on public.planned_mods (vehicle_id, status, sort_order);

create index if not exists planned_mods_vehicle_created_idx
  on public.planned_mods (vehicle_id, created_at desc);

comment on table public.planned_mods is
  'Owner build planner: planned tuning mods before garage entry.';

drop trigger if exists planned_mods_set_updated_at on public.planned_mods;
create trigger planned_mods_set_updated_at
  before update on public.planned_mods
  for each row
  execute function public.update_updated_at_column();

create table if not exists public.build_todos (
  id uuid primary key default uuid_generate_v4(),
  planned_mod_id uuid not null references public.planned_mods (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) >= 1),
  status text not null default 'pending'
    check (status in ('pending', 'done')),
  is_ai_generated boolean not null default true,
  sort_order integer not null default 0,
  completed_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (planned_mod_id, sort_order)
);

create index if not exists build_todos_planned_mod_idx
  on public.build_todos (planned_mod_id, sort_order);

create index if not exists build_todos_vehicle_idx
  on public.build_todos (vehicle_id);

comment on table public.build_todos is
  'Install checklist items for a planned mod.';

drop trigger if exists build_todos_set_updated_at on public.build_todos;
create trigger build_todos_set_updated_at
  before update on public.build_todos
  for each row
  execute function public.update_updated_at_column();

alter table public.planned_mods enable row level security;
alter table public.planned_mods force row level security;
alter table public.build_todos enable row level security;
alter table public.build_todos force row level security;

revoke all on table public.planned_mods from anon;
revoke all on table public.build_todos from anon;
grant select, insert, update, delete on table public.planned_mods to authenticated;
grant select, insert, update, delete on table public.build_todos to authenticated;

-- planned_mods policies
drop policy if exists "planned_mods_select_owner" on public.planned_mods;
drop policy if exists "planned_mods_insert_owner" on public.planned_mods;
drop policy if exists "planned_mods_update_owner" on public.planned_mods;
drop policy if exists "planned_mods_delete_owner" on public.planned_mods;

create policy "planned_mods_select_owner" on public.planned_mods
  for select to authenticated
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = planned_mods.vehicle_id and v.user_id = auth.uid()
    )
  );

create policy "planned_mods_insert_owner" on public.planned_mods
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.vehicles v
      where v.id = planned_mods.vehicle_id and v.user_id = auth.uid()
    )
  );

create policy "planned_mods_update_owner" on public.planned_mods
  for update to authenticated
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = planned_mods.vehicle_id and v.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.vehicles v
      where v.id = planned_mods.vehicle_id and v.user_id = auth.uid()
    )
  );

create policy "planned_mods_delete_owner" on public.planned_mods
  for delete to authenticated
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = planned_mods.vehicle_id and v.user_id = auth.uid()
    )
  );

-- build_todos policies
drop policy if exists "build_todos_select_owner" on public.build_todos;
drop policy if exists "build_todos_insert_owner" on public.build_todos;
drop policy if exists "build_todos_update_owner" on public.build_todos;
drop policy if exists "build_todos_delete_owner" on public.build_todos;

create policy "build_todos_select_owner" on public.build_todos
  for select to authenticated
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = build_todos.vehicle_id and v.user_id = auth.uid()
    )
  );

create policy "build_todos_insert_owner" on public.build_todos
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.vehicles v
      where v.id = build_todos.vehicle_id and v.user_id = auth.uid()
    )
  );

create policy "build_todos_update_owner" on public.build_todos
  for update to authenticated
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = build_todos.vehicle_id and v.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.vehicles v
      where v.id = build_todos.vehicle_id and v.user_id = auth.uid()
    )
  );

create policy "build_todos_delete_owner" on public.build_todos
  for delete to authenticated
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = build_todos.vehicle_id and v.user_id = auth.uid()
    )
  );
