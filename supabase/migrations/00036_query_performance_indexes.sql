-- Hot-path indexes for QR scan, document lists, and public showcase.
-- Existing: tags(uuid), documents(vehicle_id, created_at desc),
-- vehicle_events(vehicle_id, mileage desc), vehicles(public_slug).

create index if not exists documents_vehicle_id_type_idx
  on public.documents using btree (vehicle_id, type);

create index if not exists documents_vehicle_id_showcase_idx
  on public.documents using btree (vehicle_id, created_at desc)
  where show_on_public_showcase = true;

create index if not exists tags_vehicle_id_active_idx
  on public.tags using btree (vehicle_id)
  where status = 'active';

create index if not exists vehicle_contributors_lookup_idx
  on public.vehicle_contributors using btree (vehicle_id, user_id)
  where status = 'active';
