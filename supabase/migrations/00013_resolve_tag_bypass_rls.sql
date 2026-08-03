-- =============================================================================
-- ZeloxTag · Keep public QR resolver working under FORCE RLS
-- Migration: 00013_resolve_tag_bypass_rls
-- =============================================================================
-- 00012 enabled FORCE ROW LEVEL SECURITY. The digital-twin RPC is SECURITY
-- DEFINER and must bypass RLS so anonymous scanners still receive vehicle +
-- documents for an active tag uuid.
-- =============================================================================

create or replace function public.resolve_tag_by_uuid(p_uuid text)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_tag public.tags%rowtype;
  v_vehicle jsonb;
  v_documents jsonb;
begin
  if p_uuid is null or btrim(p_uuid) = '' then
    return null;
  end if;

  select *
    into v_tag
  from public.tags t
  where t.uuid = btrim(p_uuid)
  limit 1;

  if not found then
    return null;
  end if;

  if v_tag.status = 'active' and v_tag.vehicle_id is not null then
    select to_jsonb(v)
      into v_vehicle
    from public.vehicles v
    where v.id = v_tag.vehicle_id;

    select coalesce(jsonb_agg(to_jsonb(d) order by d.created_at desc), '[]'::jsonb)
      into v_documents
    from public.documents d
    where d.vehicle_id = v_tag.vehicle_id;
  else
    v_vehicle := null;
    v_documents := '[]'::jsonb;
  end if;

  return jsonb_build_object(
    'tag', to_jsonb(v_tag),
    'vehicle', v_vehicle,
    'documents', v_documents
  );
end;
$$;

revoke all on function public.resolve_tag_by_uuid(text) from public;
grant execute on function public.resolve_tag_by_uuid(text) to anon, authenticated;
