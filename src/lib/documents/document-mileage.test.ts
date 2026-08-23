import { describe, expect, it } from "vitest";

import {
  resolveDocumentMileageKm,
  resolveUploadMileageKm,
  syncApprovalFieldsMileage,
} from "@/lib/documents/document-mileage";
import type { Document } from "@/types/database";

function doc(partial: Partial<Document> & Pick<Document, "id">): Document {
  return {
    id: partial.id,
    vehicle_id: partial.vehicle_id ?? "veh-1",
    user_id: partial.user_id ?? "user-1",
    created_by: partial.created_by ?? null,
    title: partial.title ?? "Doc",
    type: partial.type ?? "invoice",
    file_url: partial.file_url ?? "mock://doc",
    vendor: partial.vendor ?? null,
    category: partial.category ?? null,
    line_items: partial.line_items ?? null,
    kba_number: partial.kba_number ?? null,
    vehicle_approvals: partial.vehicle_approvals ?? null,
    authority: partial.authority ?? null,
    conditions: partial.conditions ?? null,
    part_category: partial.part_category ?? null,
    notes: partial.notes ?? null,
    page_count: partial.page_count ?? null,
    manufacturer: partial.manufacturer ?? null,
    invoice_number: partial.invoice_number ?? null,
    mileage_km: partial.mileage_km ?? null,
    technical_specs: partial.technical_specs ?? null,
    approval_fields: partial.approval_fields ?? null,
    amount: partial.amount ?? null,
    date: partial.date ?? null,
    created_at: partial.created_at ?? "2026-01-01T00:00:00.000Z",
  };
}

describe("resolveDocumentMileageKm", () => {
  it("prefers TÜV approval_fields mileage over stale mileage_km row", () => {
    const mileage = resolveDocumentMileageKm(
      doc({
        id: "tuev-1",
        type: "tuev",
        mileage_km: 150_000,
        approval_fields: {
          kind: "tuev",
          data: {
            testingOrganization: "DEKRA",
            testDate: "2021-03-23",
            result: "no_defects",
            mileageKm: 178_605,
            nextInspectionDate: "2024-03",
            documentNumber: null,
            defectsTable: null,
            defectsList: null,
          },
        },
      }),
    );

    expect(mileage).toBe(178_605);
  });

  it("falls back to mileage_km for invoices", () => {
    expect(
      resolveDocumentMileageKm(
        doc({ id: "inv-1", type: "invoice", mileage_km: 84_200 }),
      ),
    ).toBe(84_200);
  });
});

describe("resolveUploadMileageKm", () => {
  it("uses approval_fields when form mileage is empty", () => {
    expect(
      resolveUploadMileageKm(null, {
        kind: "tuev",
        data: {
          testingOrganization: "TÜV",
          testDate: "2024-01-01",
          result: "no_defects",
          mileageKm: 120_500,
          nextInspectionDate: null,
          documentNumber: null,
          defectsTable: null,
          defectsList: null,
        },
      }),
    ).toBe(120_500);
  });

  it("prefers explicit form mileage", () => {
    expect(
      resolveUploadMileageKm(99_000, {
        kind: "tuev",
        data: {
          testingOrganization: "TÜV",
          testDate: "2024-01-01",
          result: "no_defects",
          mileageKm: 120_500,
          nextInspectionDate: null,
          documentNumber: null,
          defectsTable: null,
          defectsList: null,
        },
      }),
    ).toBe(99_000);
  });
});

describe("syncApprovalFieldsMileage", () => {
  it("patches TÜV approval mileage to match persisted row", () => {
    const synced = syncApprovalFieldsMileage(
      {
        kind: "tuev",
        data: {
          testingOrganization: "DEKRA",
          testDate: "2021-03-23",
          result: "no_defects",
          mileageKm: 150_000,
          nextInspectionDate: null,
          documentNumber: null,
          defectsTable: null,
          defectsList: null,
        },
      },
      178_605,
    );

    expect(synced?.kind).toBe("tuev");
    if (synced?.kind === "tuev") {
      expect(synced.data.mileageKm).toBe(178_605);
    }
  });
});
