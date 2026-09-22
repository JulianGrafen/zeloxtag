import { describe, expect, it } from "vitest";

import {
  buildVehicleCostOverview,
  classifySpendBucket,
} from "@/lib/documents/cost-overview";
import type { Document } from "@/types/database";

function invoice(
  overrides: Partial<Document> & { id: string },
): Document {
  return {
    id: overrides.id,
    vehicle_id: "veh-1",
    user_id: "user-1",
    created_by: null,
    title: overrides.title ?? "Rechnung",
    type: "invoice",
    file_url: "https://example.com/a.pdf",
    vendor: overrides.vendor ?? "Werkstatt",
    category: overrides.category ?? "tuning",
    line_items: overrides.line_items ?? null,
    kba_number: null,
    vehicle_approvals: null,
    authority: null,
    conditions: null,
    part_category: overrides.part_category ?? null,
    notes: null,
    page_count: null,
    manufacturer: null,
    invoice_number: null,
    mileage_km: null,
    technical_specs: null,
    approval_fields: null,
    amount: overrides.amount ?? null,
    date: overrides.date ?? "2024-06-15",
    show_on_public_showcase: false,
    created_at: overrides.created_at ?? "2024-06-15T10:00:00Z",
  };
}

describe("classifySpendBucket", () => {
  it("maps vault part categories", () => {
    expect(classifySpendBucket("Teil", "RÄDER_FELGEN")).toBe("wheels_tires");
    expect(classifySpendBucket("x", "FAHRWERK")).toBe("chassis");
  });

  it("classifies by keywords", () => {
    expect(classifySpendBucket("ST XA Gewindefahrwerk")).toBe("chassis");
    expect(classifySpendBucket("BBS LM Felgensatz")).toBe("wheels_tires");
    expect(classifySpendBucket("ECU Map Stage 2")).toBe("electrical_ecu");
  });
});

describe("buildVehicleCostOverview", () => {
  it("returns empty overview without invoices", () => {
    const overview = buildVehicleCostOverview([]);
    expect(overview.totalInvestment).toBe(0);
    expect(overview.invoiceCount).toBe(0);
    expect(overview.yearlySeries).toEqual([]);
  });

  it("aggregates tuning buckets and maintenance", () => {
    const docs = [
      invoice({
        id: "1",
        category: "tuning",
        amount: 1170,
        title: "ST XA Gewindefahrwerk",
        date: "2023-03-01",
      }),
      invoice({
        id: "2",
        category: "tuning",
        line_items: [
          { label: "BBS Felgen 19 Zoll", amount: 2400 },
          { label: "Reifen Michelin", amount: 980 },
        ],
        date: "2024-08-01",
      }),
      invoice({
        id: "3",
        category: "service",
        amount: 214,
        date: "2025-01-10",
      }),
      invoice({
        id: "4",
        category: "repair",
        amount: 200,
        date: "2025-02-01",
      }),
    ];

    const overview = buildVehicleCostOverview(docs);

    expect(overview.totalInvestment).toBe(4964);
    expect(overview.modification.total).toBe(4550);
    expect(overview.modification.positionCount).toBe(3);
    expect(overview.modification.mostExpensiveAmount).toBe(2400);
    expect(overview.maintenance.total).toBe(414);
    expect(overview.bucketBreakdown.some((b) => b.bucket === "chassis")).toBe(
      true,
    );
    expect(overview.bucketBreakdown.some((b) => b.bucket === "wheels_tires")).toBe(
      true,
    );
    expect(overview.bucketBreakdown).toHaveLength(6);
    expect(overview.modificationLines.length).toBeGreaterThanOrEqual(3);
    expect(overview.yearlySeries.map((p) => p.year)).toEqual([2023, 2024, 2025]);
  });

  it("counts documents without amount", () => {
    const overview = buildVehicleCostOverview([
      invoice({ id: "a", amount: null, line_items: null }),
      invoice({ id: "b", amount: 100 }),
    ]);
    expect(overview.documentsWithoutAmountCount).toBe(1);
    expect(overview.totalInvestment).toBe(100);
  });
});
