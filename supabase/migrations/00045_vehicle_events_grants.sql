-- Align vehicle_events privilege hygiene with 00014 zero-trust pattern.
revoke all on table public.vehicle_events from anon;
grant select, insert, update, delete on table public.vehicle_events to authenticated;
