-- =============================================================================
-- ZeloxTag · Live-Scan events (QR scans by guests) + owner notification log
-- Migration: 00098_tag_scan_events
--
-- Stores only coarse, platform-derived location (city/region/country from the
-- hosting edge) — never the scanner's IP address.
-- =============================================================================

create table if not exists public.tag_scan_events (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  tag_id uuid null references public.tags (id) on delete set null,
  scanned_at timestamptz not null default timezone('utc', now()),
  city text null check (city is null or char_length(city) <= 80),
  region text null check (region is null or char_length(region) <= 16),
  country text null check (country is null or char_length(country) <= 2),
  -- Set when this scan triggered the owner e-mail (used for throttling).
  notified_at timestamptz null
);

create index if not exists tag_scan_events_vehicle_scanned_idx
  on public.tag_scan_events (vehicle_id, scanned_at desc);

create index if not exists tag_scan_events_vehicle_notified_idx
  on public.tag_scan_events (vehicle_id, notified_at desc)
  where notified_at is not null;

comment on table public.tag_scan_events is
  'Guest QR scans per vehicle for Live-Scan notifications. Service role writes; owner reads. No IP addresses.';

alter table public.tag_scan_events enable row level security;
alter table public.tag_scan_events force row level security;

revoke all on table public.tag_scan_events from anon, authenticated;

grant select on table public.tag_scan_events to authenticated;

drop policy if exists "tag_scan_events_select_owner" on public.tag_scan_events;
create policy "tag_scan_events_select_owner" on public.tag_scan_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.vehicles v
      where v.id = tag_scan_events.vehicle_id
        and v.user_id = auth.uid()
    )
  );
