-- Tighten the anon-callable QR resolver.
--
-- Previous version returned `to_jsonb(v_tag)` (leaking the internal vehicle_id)
-- and `public_slug` even when the vehicle was not published. Both let an
-- unauthenticated scanner pivot to storage paths and unpublished share links.
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
    select jsonb_build_object(
      'id', v.id,
      'user_id', null,
      'make', v.make,
      'model', v.model,
      'year', v.year,
      'vin', null,
      'tech_specs', coalesce(v.tech_specs, '{}'::jsonb),
      'silhouette_image_url', v.silhouette_image_url,
      'is_public', v.is_public,
      'hide_financials', v.hide_financials,
      -- Share slug is only meaningful once the owner published the profile.
      'public_slug', case when v.is_public then v.public_slug else null end,
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
    'tag', jsonb_build_object(
      'id', v_tag.id,
      'uuid', v_tag.uuid,
      'status', v_tag.status,
      -- vehicle_id intentionally omitted for anon callers.
      'vehicle_id', null,
      'created_at', v_tag.created_at,
      'updated_at', v_tag.updated_at
    ),
    'vehicle', v_vehicle,
    'documents', '[]'::jsonb
  );
end;
$$;

revoke all on function public.resolve_tag_by_uuid(text) from public;
grant execute on function public.resolve_tag_by_uuid(text) to anon, authenticated;

comment on function public.resolve_tag_by_uuid(text) is
  'Public QR resolver: vehicle identity + tech_specs + showcase flags. No docs, VIN, owner id, internal vehicle_id, or unpublished slug.';
