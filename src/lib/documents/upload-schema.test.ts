import { describe, expect, it } from "vitest";

import {
  UPLOAD_NOTES_MAX,
  uploadDocumentMetaSchema,
} from "@/lib/documents/upload-schema";

function teilegutachtenMeta(overrides: Record<string, unknown> = {}) {
  return {
    vehicleId: "550e8400-e29b-41d4-a716-446655440000",
    tagUuid: "zlx-test1234",
    title: "Teilegutachten · Eibach · Federn",
    type: "abe",
    vendor: "Eibach 21-85-041-01-VA",
    category: "abe",
    lineItems: "",
    kbaNumber: "14-00123-CP-GBM",
    vehicleApprovals: JSON.stringify([
      "Mazda RX-8 (SE3P)",
      "Mazda 3 (BK)",
    ]),
    authority: "TÜV SÜD Automotive GmbH",
    conditions: JSON.stringify(["Sichtprüfung der Befestigungspunkte"]),
    technicalSpecs: "",
    partCategory: "Sonderfahrwerksfedern",
    notes: [
      "Fahrzeug-Check: verified",
      "Trefferzeile: Mazda RX-8 (SE3P)",
      "Kennzeichnung: Aufdruck auf den Federwindungen",
      "Hinweis: Teilegutachten allein nicht straßenverkehrsrechtlich gültig — Anbauabnahme erforderlich.",
    ].join("\n"),
    manufacturer: "Eibach",
    invoiceNumber: "14-00123-CP-GBM",
    mileageKm: "",
    pageCount: "1",
    approvalFields: JSON.stringify({
      kind: "teilegutachten",
      data: {
        testingOrganization: "TÜV",
        documentNumber: "14-00123-CP-GBM",
        validityArea: "Mazda RX-8 (SE3P)\n\nAuflagen:\nSichtprüfung",
        immediateInspectionRequired: true,
      },
    }),
    date: "2026-08-06",
    amount: "",
    forceVehicleAssign: "",
    forceMileageSave: "",
    ...overrides,
  };
}

describe("uploadDocumentMetaSchema", () => {
  it("accepts typical Teilegutachten upload metadata", () => {
    const parsed = uploadDocumentMetaSchema.safeParse(teilegutachtenMeta());
    expect(parsed.success).toBe(true);
  });

  it("accepts notes up to the configured limit", () => {
    const parsed = uploadDocumentMetaSchema.safeParse(
      teilegutachtenMeta({
        notes: "x".repeat(UPLOAD_NOTES_MAX),
      }),
    );
    expect(parsed.success).toBe(true);
  });

  it("rejects notes above the configured limit", () => {
    const parsed = uploadDocumentMetaSchema.safeParse(
      teilegutachtenMeta({
        notes: "x".repeat(UPLOAD_NOTES_MAX + 1),
      }),
    );
    expect(parsed.success).toBe(false);
  });

  it("accepts forceVehicleAssign for mismatch override saves", () => {
    const parsed = uploadDocumentMetaSchema.safeParse(
      teilegutachtenMeta({ forceVehicleAssign: "1" }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.forceVehicleAssign).toBe("1");
    }
  });

  it("accepts forceMileageSave for mileage override saves", () => {
    const parsed = uploadDocumentMetaSchema.safeParse(
      teilegutachtenMeta({ forceMileageSave: "1" }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.forceMileageSave).toBe("1");
    }
  });
});
