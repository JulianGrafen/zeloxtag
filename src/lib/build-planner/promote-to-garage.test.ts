import { describe, expect, it } from "vitest";

import { MANUAL_ENTRY_MARKER } from "@/lib/documents/manual-entries";
import { buildTuningDocumentRowFromPlannedMod } from "@/lib/build-planner/promote-to-garage";
import type { PlannedMod } from "@/types/database";

const mod: PlannedMod = {
  id: "mod-1",
  vehicle_id: "veh-1",
  user_id: "owner-1",
  status: "active",
  title: "  Bremsscheiben Kit  ",
  manufacturer: "Brembo",
  category: "brakes",
  planned_price_eur: 899.5,
  source_url: "https://shop.example/brembo",
  source_kind: "link",
  source_payload: null,
  ai_model: "gpt-test",
  document_id: null,
  completed_at: null,
  sort_order: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("buildTuningDocumentRowFromPlannedMod", () => {
  it("maps tuning manual entry fields", () => {
    const row = buildTuningDocumentRowFromPlannedMod({
      mod,
      ownerUserId: "owner-1",
      sessionUserId: "session-1",
      showOnPublicShowcase: true,
      documentId: "doc-1",
      dateIso: "2026-03-15",
    });

    expect(row.title).toBe("Bremsscheiben Kit");
    expect(row.category).toBe("tuning");
    expect(row.invoice_number).toBe(MANUAL_ENTRY_MARKER);
    expect(row.amount).toBe(899.5);
    expect(row.show_on_public_showcase).toBe(true);
    expect(row.notes).toContain("Build Planner");
    expect(row.notes).toContain("https://shop.example/brembo");
  });
});
