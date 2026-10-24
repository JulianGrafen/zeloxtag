import { describe, expect, it } from "vitest";

import type { Document } from "@/types/database";

import { legacyServiceRecordsFromDocuments, mergeServiceHistory } from "./legacy-from-documents";
import { rowToServiceRecord } from "./service-record";

function doc(partial: Partial<Document> & { id: string }): Document {
  return {
    id: partial.id,
    vehicle_id: partial.vehicle_id ?? "veh-1",
    title: partial.title ?? "Ölwechsel",
    type: partial.type ?? "invoice",
    file_url: partial.file_url ?? "https://example.com/a.pdf",
    amount: partial.amount ?? null,
    date: partial.date ?? "2024-01-15",
    created_at: partial.created_at ?? "2024-01-15T00:00:00Z",
    updated_at: partial.updated_at ?? "2024-01-15T00:00:00Z",
    category: partial.category ?? "service",
    vendor: partial.vendor ?? "Werkstatt",
    notes: partial.notes ?? "Ölwechsel · 5W-30",
    mileage_km: partial.mileage_km ?? 10_000,
    line_items: partial.line_items ?? [],
    invoice_number: partial.invoice_number ?? null,
    show_on_public_showcase: partial.show_on_public_showcase ?? false,
    ...partial,
  } as Document;
}

describe("legacyServiceRecordsFromDocuments", () => {
  it("maps oil invoice to legacy service record", () => {
    const records = legacyServiceRecordsFromDocuments([
      doc({ id: "d1", title: "Ölwechsel inkl. Filter" }),
    ]);
    expect(records).toHaveLength(1);
    expect(records[0].category).toBe("oil_change");
    expect(records[0].invoiceDocumentId).toBe("d1");
  });
});

describe("mergeServiceHistory", () => {
  it("dedupes legacy when database row links same document", () => {
    const db = rowToServiceRecord({
      id: "sr-1",
      vehicle_id: "veh-1",
      category: "oil_change",
      title: "Ölwechsel",
      service_date: "2024-02-01",
      mileage_km: 20_000,
      performed_by: null,
      notes: null,
      invoice_document_id: "d1",
      next_interval_mileage_km: 30_000,
      next_interval_date: "2025-02-01",
      show_on_public_showcase: false,
      created_at: "2024-02-01T00:00:00Z",
      updated_at: "2024-02-01T00:00:00Z",
    });
    const merged = mergeServiceHistory(
      [db],
      legacyServiceRecordsFromDocuments([doc({ id: "d1" })]),
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("sr-1");
  });
});
