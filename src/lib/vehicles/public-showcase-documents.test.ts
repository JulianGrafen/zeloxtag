import { describe, expect, it } from "vitest";

import {
  isShowcaseModificationDocument,
  partitionShowcaseSelectableDocuments,
} from "@/lib/vehicles/public-showcase-documents";
import type { Document } from "@/types/database";

function baseDoc(overrides: Partial<Document> = {}): Document {
  return {
    id: "doc-1",
    vehicle_id: "11111111-1111-4111-8111-111111111111",
    user_id: "22222222-2222-4222-8222-222222222222",
    created_by: "22222222-2222-4222-8222-222222222222",
    title: "Work Emotion CR",
    type: "invoice",
    file_url: "https://example.com/felgen.jpg",
    vendor: null,
    category: "tuning",
    line_items: null,
    kba_number: null,
    vehicle_approvals: null,
    authority: null,
    conditions: null,
    part_category: null,
    notes: null,
    page_count: 1,
    manufacturer: null,
    invoice_number: "__manual__",
    mileage_km: null,
    technical_specs: null,
    approval_fields: null,
    amount: null,
    date: "2026-03-01",
    show_on_public_showcase: true,
    created_at: "2026-03-01T00:00:00Z",
    ...overrides,
  };
}

describe("partitionShowcaseSelectableDocuments", () => {
  it("lists Umbau-Bilder under modifications even when type is invoice", () => {
    const umbau = baseDoc();
    const invoice = baseDoc({
      id: "doc-2",
      title: "Rechnung Fahrwerk",
      invoice_number: "RE-88",
      category: "service",
    });

    expect(isShowcaseModificationDocument(umbau)).toBe(true);
    expect(isShowcaseModificationDocument(invoice)).toBe(false);

    const { invoices, modifications } = partitionShowcaseSelectableDocuments([
      umbau,
      invoice,
    ]);

    expect(modifications.map((doc) => doc.id)).toEqual(["doc-1"]);
    expect(invoices.map((doc) => doc.id)).toEqual(["doc-2"]);
  });
});
