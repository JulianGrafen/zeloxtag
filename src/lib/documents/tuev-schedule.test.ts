import { describe, expect, it } from "vitest";

import {
  deriveNextInspectionFromDocuments,
  nextTuevDateFromReportDate,
  yearMonthToIsoDate,
} from "@/lib/documents/tuev-schedule";
import type { Document } from "@/types/database";

function tuevDocument(
  overrides: Partial<Document> & Pick<Document, "id" | "vehicle_id">,
): Document {
  return {
    user_id: "user-1",
    title: "TÜV / HU",
    type: "tuev",
    category: "tuev",
    file_url: "/demo/tuev.pdf",
    amount: null,
    date: "2024-04-12",
    vendor: "TÜV",
    line_items: null,
    kba_number: null,
    vehicle_approvals: null,
    authority: null,
    conditions: null,
    part_category: null,
    notes: null,
    page_count: 1,
    manufacturer: null,
    invoice_number: null,
    mileage_km: 87200,
    technical_specs: null,
    approval_fields: null,
    created_by: null,
    created_at: "2024-04-12T10:00:00.000Z",
    ...overrides,
  };
}

describe("yearMonthToIsoDate", () => {
  it("defaults to first day without a reference date", () => {
    expect(yearMonthToIsoDate("2028-05")).toBe("2028-05-01");
  });

  it("preserves day-of-month from Prüfdatum reference", () => {
    expect(yearMonthToIsoDate("2028-08", "2026-08-23")).toBe("2028-08-23");
  });
});

describe("deriveNextInspectionFromDocuments", () => {
  it("uses Prüfdatum + 24 months (same day) as primary source", () => {
    const documents = [
      tuevDocument({
        id: "doc-1",
        vehicle_id: "veh-1",
        approval_fields: {
          kind: "tuev",
          data: {
            testingOrganization: "TÜV",
            testDate: "2026-08-23",
            result: "no_defects",
            mileageKm: 87200,
            nextInspectionDate: "2028-08",
            documentNumber: null,
            defectsTable: null,
            defectsList: null,
          },
        },
      }),
    ];

    expect(deriveNextInspectionFromDocuments(documents)).toEqual({
      nextDate: "2028-08-23",
    });
  });

  it("preserves day when only nextInspectionDate month is stored", () => {
    const documents = [
      tuevDocument({
        id: "doc-1",
        vehicle_id: "veh-1",
        date: "2026-08-23",
        approval_fields: {
          kind: "tuev",
          data: {
            testingOrganization: "TÜV",
            testDate: "2026-08-23",
            result: "no_defects",
            mileageKm: 87200,
            nextInspectionDate: "2028-08",
            documentNumber: null,
            defectsTable: null,
            defectsList: null,
          },
        },
      }),
    ];

    expect(deriveNextInspectionFromDocuments(documents)).toEqual({
      nextDate: "2028-08-23",
    });
  });

  it("falls back to report date + 24 months", () => {
    const documents = [
      tuevDocument({
        id: "doc-1",
        vehicle_id: "veh-1",
        date: "2024-04-12",
        approval_fields: null,
      }),
    ];

    expect(deriveNextInspectionFromDocuments(documents)).toEqual({
      nextDate: nextTuevDateFromReportDate("2024-04-12"),
    });
  });
});
