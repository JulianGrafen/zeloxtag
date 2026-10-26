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

    const { invoices, modifications, manualEntries } =
      partitionShowcaseSelectableDocuments([umbau, invoice]);

    expect(modifications.map((doc) => doc.id)).toEqual(["doc-1"]);
    expect(manualEntries).toHaveLength(0);
    expect(invoices.map((doc) => doc.id)).toEqual(["doc-2"]);
  });

  it("lists manual service entries separately from invoices and umbauten", () => {
    const service = baseDoc({
      id: "manual-service",
      title: "Ölwechsel",
      category: "service",
      invoice_number: "__manual__",
      file_url: "manual://entry",
    });

    const { manualEntries, modifications, invoices } =
      partitionShowcaseSelectableDocuments([service]);

    expect(manualEntries.map((doc) => doc.id)).toEqual(["manual-service"]);
    expect(modifications).toHaveLength(0);
    expect(invoices).toHaveLength(0);
  });

  it("treats legacy manual Umbauten without category as modifications", () => {
    const legacy = baseDoc({
      id: "legacy-umbau",
      category: null,
      title: "Felgen Umbau",
    });

    expect(isShowcaseModificationDocument(legacy)).toBe(true);

    const { modifications } = partitionShowcaseSelectableDocuments([legacy]);
    expect(modifications.map((doc) => doc.id)).toEqual(["legacy-umbau"]);
  });

  it("treats empty category string as Umbau for manual entries", () => {
    const legacy = baseDoc({
      id: "legacy-empty-cat",
      category: "",
      title: "Spoiler",
    });

    expect(isShowcaseModificationDocument(legacy)).toBe(true);
  });

  it("lists manual service entries with stored photos under modifications", () => {
    const servicePhoto = baseDoc({
      id: "service-photo",
      title: "Felgen montiert",
      category: "service",
      file_url: "https://example.com/montage.jpg",
    });

    const { modifications, manualEntries } =
      partitionShowcaseSelectableDocuments([servicePhoto]);

    expect(modifications.map((doc) => doc.id)).toEqual(["service-photo"]);
    expect(manualEntries).toHaveLength(0);
  });

  it("lists scanned tuning invoices with photos as modifications", () => {
    const scanned = baseDoc({
      id: "scan-tuning",
      title: "KW V3",
      invoice_number: "RE-100",
      category: "tuning",
      file_url: "https://example.com/rechnung.jpg",
    });

    expect(isShowcaseModificationDocument(scanned)).toBe(true);

    const { modifications, invoices } =
      partitionShowcaseSelectableDocuments([scanned]);

    expect(modifications.map((doc) => doc.id)).toEqual(["scan-tuning"]);
    expect(invoices).toHaveLength(0);
  });
});
