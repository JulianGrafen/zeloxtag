-- =============================================================================
-- ZeloxTag · Contributors may SELECT invoice documents only
-- Migration: 00019_contributor_invoice_select_only
-- =============================================================================
-- HIGH: documents_select_contributor previously allowed SELECT of all types
-- (ABE / TÜV / approval_fields). Product intent: Schrauber = invoices only.
-- =============================================================================

drop policy if exists "documents_select_contributor" on public.documents;

create policy "documents_select_contributor" on public.documents
  for select
  to authenticated
  using (
    public.is_active_vehicle_contributor(vehicle_id)
    and type = 'invoice'
  );
