import { randomUUID } from "crypto";

import { MANUAL_ENTRY_MARKER } from "@/lib/documents/manual-entries";
import type { PlannedMod } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PromotePlannedModInput = {
  mod: PlannedMod;
  ownerUserId: string;
  sessionUserId: string;
  showOnPublicShowcase: boolean;
};

/** Pure mapping for tests and document insert. */
export function buildTuningDocumentRowFromPlannedMod(
  input: PromotePlannedModInput & { documentId: string; dateIso: string },
) {
  const notesParts = [
    "Übernommen aus Build Planner.",
    input.mod.source_url ? `Quelle: ${input.mod.source_url}` : null,
    input.mod.manufacturer ? `Hersteller: ${input.mod.manufacturer}` : null,
  ].filter(Boolean);

  return {
    id: input.documentId,
    vehicle_id: input.mod.vehicle_id,
    user_id: input.ownerUserId,
    created_by: input.sessionUserId,
    title: input.mod.title.trim(),
    type: "invoice" as const,
    file_url: "manual://build-planner",
    vendor: input.mod.manufacturer,
    category: "tuning",
    line_items: null,
    kba_number: null,
    vehicle_approvals: null,
    authority: null,
    conditions: null,
    part_category: input.mod.category,
    notes: notesParts.length > 0 ? notesParts.join("\n") : null,
    page_count: null,
    manufacturer: input.mod.manufacturer,
    invoice_number: MANUAL_ENTRY_MARKER,
    mileage_km: null,
    technical_specs: null,
    approval_fields: null,
    amount: input.mod.planned_price_eur,
    date: input.dateIso,
    show_on_public_showcase: input.showOnPublicShowcase,
  };
}

export async function insertTuningDocumentFromPlannedMod(
  supabase: SupabaseClient,
  input: PromotePlannedModInput,
): Promise<{ documentId: string } | { error: string }> {
  const documentId = randomUUID();
  const today = new Date().toISOString().slice(0, 10);
  const row = buildTuningDocumentRowFromPlannedMod({
    ...input,
    documentId,
    dateIso: today,
  });

  const { error } = await supabase.from("documents").insert(row);
  if (error) {
    console.error("[build-planner] document insert failed", error);
    return { error: "Garage-Eintrag konnte nicht erstellt werden." };
  }

  return { documentId };
}
