import { describe, expect, it } from "vitest";

import {
  filterAbeFamilyDocuments,
  filterAbeFamilyDocumentsByKind,
  isAbeFamilyDocument,
  resolveAbeFamilyKind,
} from "@/lib/documents/abe-family-documents";
import type { Document } from "@/types/database";

function baseDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: "doc-1",
    vehicle_id: "veh-1",
    user_id: "user-1",
    created_by: "user-1",
    title: "ABE Keskin KT15",
    type: "abe",
    file_url: "https://example.com/abe.pdf",
    vendor: "Keskin",
    category: "abe",
    line_items: null,
    kba_number: "KBA 12345",
    vehicle_approvals: null,
    authority: null,
    conditions: null,
    part_category: "Felgen",
    notes: null,
    page_count: 1,
    manufacturer: "Keskin",
    invoice_number: null,
    mileage_km: null,
    technical_specs: null,
    approval_fields: { kind: "abe" },
    amount: null,
    date: "2024-03-14",
    created_at: "2024-03-14T10:00:00.000Z",
    ...overrides,
  };
}

describe("isAbeFamilyDocument", () => {
  it("accepts plain ABE, Teilegutachten and Einzelabnahme", () => {
    expect(isAbeFamilyDocument(baseDocument())).toBe(true);
    expect(
      isAbeFamilyDocument(
        baseDocument({
          title: "Teilegutachten Eibach",
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
    ).toBe(true);
    expect(
      isAbeFamilyDocument(
        baseDocument({
          title: "Einzelabnahme",
          approval_fields: {
            kind: "einzelabnahme",
            data: {
              officialExpert: "SV",
              reportNumber: "EA-1",
              field22Text: "Felge",
            },
          },
        }),
      ),
    ).toBe(true);
  });

  it("rejects invoices, TÜV and EG-BE", () => {
    expect(isAbeFamilyDocument(baseDocument({ type: "invoice" }))).toBe(false);
    expect(isAbeFamilyDocument(baseDocument({ type: "tuev" }))).toBe(false);
    expect(
      isAbeFamilyDocument(
        baseDocument({
          approval_fields: {
            kind: "egbe",
            data: { eMark: "e1*", componentGroup: "Licht" },
          },
        }),
      ),
    ).toBe(false);
  });
});

describe("filterAbeFamilyDocumentsByKind", () => {
  it("filters by approval subtype", () => {
    const docs = [
      baseDocument({ id: "abe-1" }),
      baseDocument({
        id: "tg-1",
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
      baseDocument({
        id: "ea-1",
        approval_fields: {
          kind: "einzelabnahme",
          data: {
            officialExpert: "SV",
            reportNumber: "EA-1",
            field22Text: "Felge",
          },
        },
      }),
    ];

    expect(filterAbeFamilyDocuments(docs)).toHaveLength(3);
    expect(
      filterAbeFamilyDocumentsByKind(docs, "teilegutachten").map((doc) => doc.id),
    ).toEqual(["tg-1"]);
    expect(resolveAbeFamilyKind(docs[0]!)).toBe("abe");
  });
});
