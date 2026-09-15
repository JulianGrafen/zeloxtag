import { describe, expect, it } from "vitest";

import { buildManualOilChangePersistPatch } from "@/lib/documents/manual-oil-change-patch";
import { MANUAL_ENTRY_MARKER } from "@/lib/documents/manual-entries";
import type { Document } from "@/types/database";

function oilDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: "doc-1",
    vehicle_id: "veh-1",
    user_id: "user-1",
    created_by: "user-1",
    title: "Ölwechsel",
    type: "invoice",
    file_url: "manual://entry/doc-1",
    vendor: "Werkstatt A",
    category: "service",
    line_items: null,
    kba_number: null,
    vehicle_approvals: null,
    authority: null,
    conditions: null,
    part_category: null,
    notes: "Ölwechsel · 5W-30 · 5 l · Filter gewechselt",
    page_count: null,
    manufacturer: null,
    invoice_number: MANUAL_ENTRY_MARKER,
    mileage_km: 50000,
    technical_specs: null,
    approval_fields: null,
    amount: null,
    date: "2024-06-01",
    created_at: "2024-06-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("buildManualOilChangePersistPatch", () => {
  it("rebuilds notes when oil spec changes", () => {
    const patch = buildManualOilChangePersistPatch(oilDocument(), {
      oilSpec: "0W-20",
    });
    expect(patch.notes).toContain("0W-20");
    expect(patch.title).toBe("Ölwechsel");
  });
});
