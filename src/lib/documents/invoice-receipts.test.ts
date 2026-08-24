import { describe, expect, it } from "vitest";

import {
  filterInvoiceReceiptDocuments,
  isInvoiceReceiptDocument,
} from "@/lib/documents/invoice-receipts";
import { MANUAL_ENTRY_MARKER } from "@/lib/documents/manual-entries";
import type { Document } from "@/types/database";

function baseDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: "doc-1",
    vehicle_id: "veh-1",
    user_id: "user-1",
    created_by: "user-1",
    title: "Rechnung",
    type: "invoice",
    file_url: "https://example.com/invoice.pdf",
    vendor: "Werkstatt",
    category: "repair",
    line_items: null,
    kba_number: null,
    vehicle_approvals: null,
    authority: null,
    conditions: null,
    part_category: null,
    notes: null,
    page_count: 1,
    manufacturer: null,
    invoice_number: "RE-1",
    mileage_km: null,
    technical_specs: null,
    approval_fields: null,
    amount: 120,
    date: "2026-03-01",
    created_at: "2026-03-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("isInvoiceReceiptDocument", () => {
  it("accepts scanned invoice receipts", () => {
    expect(isInvoiceReceiptDocument(baseDocument())).toBe(true);
  });

  it("rejects manual timeline entries", () => {
    expect(
      isInvoiceReceiptDocument(
        baseDocument({ invoice_number: MANUAL_ENTRY_MARKER }),
      ),
    ).toBe(false);
  });

  it("rejects ABE and TÜV documents even when type is wrong", () => {
    expect(
      isInvoiceReceiptDocument(
        baseDocument({
          approval_fields: {
            kind: "teilegutachten",
            data: {
              testingOrganization: "TÜV",
              documentNumber: "TG-1",
              validityArea: "Test",
              immediateInspectionRequired: true,
            },
          },
        }),
      ),
    ).toBe(false);

    expect(
      isInvoiceReceiptDocument(
        baseDocument({
          type: "invoice",
          category: "tuev",
          approval_fields: {
            kind: "tuev",
            data: {
              testingOrganization: "DEKRA",
              testDate: "2026-03-01",
              result: "no_defects",
              mileageKm: 100_000,
              nextInspectionDate: "2028-03",
              documentNumber: null,
              defectsTable: null,
              defectsList: null,
            },
          },
        }),
      ),
    ).toBe(false);
  });

  it("rejects non-invoice document types", () => {
    expect(isInvoiceReceiptDocument(baseDocument({ type: "abe" }))).toBe(false);
    expect(isInvoiceReceiptDocument(baseDocument({ type: "tuev" }))).toBe(false);
  });
});

describe("filterInvoiceReceiptDocuments", () => {
  it("returns only invoice receipts", () => {
    const docs = [
      baseDocument({ id: "invoice-1" }),
      baseDocument({ id: "manual-1", invoice_number: MANUAL_ENTRY_MARKER }),
      baseDocument({ id: "abe-1", type: "abe" }),
    ];

    expect(filterInvoiceReceiptDocuments(docs).map((doc) => doc.id)).toEqual([
      "invoice-1",
    ]);
  });
});
