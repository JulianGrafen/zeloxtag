import { describe, expect, it } from "vitest";

import {
  extractVehicleModifications,
  sumVehicleModificationAmounts,
} from "@/lib/vehicles/vehicle-modifications";
import type { Document } from "@/types/database";

const vehicleId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";

function baseDoc(overrides: Partial<Document> = {}): Document {
  return {
    id: "doc-1",
    vehicle_id: vehicleId,
    user_id: userId,
    created_by: userId,
    title: "Sportauspuff",
    type: "invoice",
    file_url: "https://example.com/x.pdf",
    vendor: "Werkstatt Süd",
    category: "tuning",
    line_items: null,
    kba_number: null,
    vehicle_approvals: null,
    authority: null,
    conditions: null,
    part_category: null,
    notes: null,
    page_count: null,
    manufacturer: null,
    invoice_number: "RE-1",
    mileage_km: null,
    technical_specs: null,
    approval_fields: null,
    amount: 2400,
    date: "2026-03-01",
    show_on_public_showcase: true,
    created_at: "2026-03-01T00:00:00Z",
    ...overrides,
  };
}

describe("extractVehicleModifications", () => {
  it("falls back to document title when tuning invoice has no line items", () => {
    const mods = extractVehicleModifications(
      [
        baseDoc({
          title: "GReddy GT-Flügel",
          line_items: null,
          amount: 2380,
        }),
      ],
      { hideFinancials: false },
    );

    expect(mods).toHaveLength(1);
    expect(mods[0]?.partName).toBe("GReddy GT-Flügel");
    expect(mods[0]?.amount).toBe(2380);
    expect(mods[0]?.source).toBe("invoice");
  });

  it("uses vendor when OCR saved vendor as title", () => {
    const mods = extractVehicleModifications(
      [
        baseDoc({
          title: "2JZ Tuning Garage Heilbronn",
          vendor: "2JZ Tuning Garage Heilbronn",
          line_items: null,
        }),
      ],
      { hideFinancials: false },
    );

    expect(mods[0]?.partName).toBe("2JZ Tuning Garage Heilbronn");
  });

  it("extracts line items from tuning invoices when present", () => {
    const mods = extractVehicleModifications(
      [
        baseDoc({
          line_items: [
            { label: "Akrapovic Auspuff", amount: 2400 },
            { label: "MwSt. 19 %", amount: 456 },
          ],
        }),
      ],
      { hideFinancials: false },
    );

    expect(mods).toHaveLength(1);
    expect(mods[0]?.partName).toBe("Akrapovic Auspuff");
  });

  it("falls back to document level when all line items are labor or vat", () => {
    const mods = extractVehicleModifications(
      [
        baseDoc({
          title: "HKS Fahrwerk Einbau",
          line_items: [
            { label: "Arbeitslohn Fahrwerk", amount: 380 },
            { label: "MwSt. 19 %", amount: 185 },
          ],
          amount: 749,
        }),
      ],
      { hideFinancials: false },
    );

    expect(mods).toHaveLength(1);
    expect(mods[0]?.partName).toBe("HKS Fahrwerk Einbau");
    expect(mods[0]?.amount).toBe(749);
  });

  it("includes ABE documents", () => {
    const mods = extractVehicleModifications(
      [
        baseDoc({
          id: "abe-1",
          type: "abe",
          category: "abe",
          title: "Widebody Kotflügel Satz",
          part_category: "Aerodynamik",
          manufacturer: "Rocket Bunny",
          kba_number: "ABE KBA 44521",
          authority: "KBA",
          amount: null,
        }),
      ],
      { hideFinancials: false },
    );

    expect(mods).toHaveLength(1);
    expect(mods[0]?.source).toBe("abe");
    expect(mods[0]?.partName).toBe("Widebody Kotflügel Satz");
    expect(mods[0]?.kbaNumber).toBe("ABE KBA 44521");
  });

  it("ignores service invoices without tuning category", () => {
    const mods = extractVehicleModifications(
      [
        baseDoc({
          category: "service",
          title: "Ölwechsel",
          line_items: [{ label: "Motoröl 5W-30", amount: 214.5 }],
        }),
      ],
      { hideFinancials: false },
    );

    expect(mods).toHaveLength(0);
  });

  it("parses line_items from JSON string payloads", () => {
    const mods = extractVehicleModifications(
      [
        baseDoc({
          line_items: JSON.stringify([
            { label: "Coilovers TEIN", amount: 1290 },
          ]) as unknown as Document["line_items"],
        }),
      ],
      { hideFinancials: false },
    );

    expect(mods[0]?.partName).toBe("Coilovers TEIN");
  });

  it("respects documentFilter for public showcase scope", () => {
    const mods = extractVehicleModifications(
      [baseDoc({ show_on_public_showcase: false })],
      {
        hideFinancials: true,
        documentFilter: (doc) => doc.show_on_public_showcase === true,
      },
    );

    expect(mods).toHaveLength(0);
  });
});

describe("sumVehicleModificationAmounts", () => {
  it("sums finite amounts and ignores nulls", () => {
    const total = sumVehicleModificationAmounts([
      {
        id: "1",
        category: "Tuning",
        partName: "A",
        manufacturer: null,
        kbaNumber: null,
        approvalStatus: "Rechnung",
        date: "2026-01-01",
        amount: 100,
        source: "invoice",
      },
      {
        id: "2",
        category: "Tuning",
        partName: "B",
        manufacturer: null,
        kbaNumber: null,
        approvalStatus: "Rechnung",
        date: "2026-01-02",
        amount: null,
        source: "invoice",
      },
      {
        id: "3",
        category: "Tuning",
        partName: "C",
        manufacturer: null,
        kbaNumber: null,
        approvalStatus: "Rechnung",
        date: "2026-01-03",
        amount: 50,
        source: "invoice",
      },
    ]);

    expect(total).toBe(150);
  });
});
