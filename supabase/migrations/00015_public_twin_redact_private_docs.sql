-- =============================================================================
-- ZeloxTag · Public QR twin must not expose private documents
-- Migration: 00015_public_twin_redact_private_docs
-- =============================================================================
-- Defense in depth: anon/authenticated callers of resolve_tag_by_uuid must never
-- receive invoices, PDFs, VIN, or owner user_id. Full twin stays on the
-- service-role server path after ownership checks.
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
    -- Public vehicle identity only — no user_id, no VIN, no documents.
    select jsonb_build_object(
      'id', v.id,
      'user_id', null,
      'make', v.make,
      'model', v.model,
      'year', v.year,
      'vin', null,
      'created_at', v.created_at,
      'updated_at', v.updated_at
    )
      into v_vehicle
    from public.vehicles v
    where v.id = v_tag.vehicle_id;
  else
    v_vehicle := null;
  end if;

  return jsonb_build_object(
    'tag', to_jsonb(v_tag),
    'vehicle', v_vehicle,
    'documents', '[]'::jsonb
  );
end;
$$;

revoke all on function public.resolve_tag_by_uuid(text) from public;
grant execute on function public.resolve_tag_by_uuid(text) to anon, authenticated;

comment on function public.resolve_tag_by_uuid(text) is
  'Public QR resolver: active tags return vehicle identity only (no docs/VIN/owner id).';
