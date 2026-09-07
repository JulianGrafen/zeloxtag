import { describe, expect, it } from "vitest";

import type { Document } from "@/types/database";

import {
  DEFAULT_OIL_INTERVAL_KM,
  DEFAULT_OIL_INTERVAL_MONTHS,
  isOilChangeSelfMadeVendor,
  oilChangeRecordListSubtitle,
  oilChangeRecordsFromDocuments,
  resolveOilChangeInterval,
  resolveOilChangeVendor,
} from "./oil-changes";

function oilChangeDocument(
  overrides: Partial<Document> & Pick<Document, "id">,
): Document {
  return {
    id: overrides.id,
    vehicle_id: "vehicle-1",
    user_id: "user-1",
    created_by: "user-1",
    title: overrides.title ?? "Ölwechsel",
    type: "invoice",
    file_url: overrides.file_url ?? "mock://invoice",
    vendor: overrides.vendor ?? "Werkstatt",
    category: overrides.category ?? "service",
    line_items: overrides.line_items ?? null,
    kba_number: null,
    vehicle_approvals: null,
    authority: null,
    conditions: null,
    part_category: null,
    notes: overrides.notes ?? "Motoröl 5W-30 · Ölfilter",
    page_count: null,
    manufacturer: null,
    invoice_number: overrides.invoice_number ?? null,
    mileage_km: overrides.mileage_km ?? 80_000,
    technical_specs: null,
    approval_fields: null,
    amount: overrides.amount ?? null,
    date: overrides.date ?? "2025-06-15",
    created_at: overrides.created_at ?? "2025-06-15T10:00:00.000Z",
  };
}

describe("resolveOilChangeInterval", () => {
  it("returns defaults when specs are missing", () => {
    expect(resolveOilChangeInterval(null)).toEqual({
      intervalKm: DEFAULT_OIL_INTERVAL_KM,
      intervalMonths: DEFAULT_OIL_INTERVAL_MONTHS,
    });
  });

  it("uses custom km and months from tech_specs", () => {
    expect(
      resolveOilChangeInterval({
        oilChangeIntervalKm: 15_000,
        oilChangeIntervalMonths: 24,
      }),
    ).toEqual({
      intervalKm: 15_000,
      intervalMonths: 24,
    });
  });
});

describe("resolveOilChangeVendor", () => {
  it("stores Selbst gemacht when selfMade is checked", () => {
    expect(resolveOilChangeVendor(true, "")).toBe("Selbst gemacht");
    expect(resolveOilChangeVendor(true, "Werkstatt XY")).toBe("Selbst gemacht");
  });

  it("keeps workshop name when not self-made", () => {
    expect(resolveOilChangeVendor(false, "Auto Meister")).toBe("Auto Meister");
    expect(resolveOilChangeVendor(false, "")).toBeNull();
  });
});

describe("oilChangeRecordListSubtitle", () => {
  it("shows self-made label in the list row", () => {
    const subtitle = oilChangeRecordListSubtitle({
      id: "1",
      date: "01.01.2026",
      mileageKm: 84_200,
      workshop: "Selbst gemacht",
      oilSpec: null,
      oilAmountLiters: null,
      filterChanged: true,
      intervalKm: 10_000,
      intervalMonths: 12,
      nextDueKm: 94_200,
      nextDueDate: "01.01.2027",
      notes: "",
      status: "aktuell",
    });

    expect(subtitle).toContain("Selbst gemacht");
    expect(isOilChangeSelfMadeVendor("Selbst gemacht")).toBe(true);
  });

  it("omits zero liters from the subtitle", () => {
    const subtitle = oilChangeRecordListSubtitle({
      id: "1",
      date: "01.01.2026",
      mileageKm: 84_200,
      workshop: null,
      oilSpec: null,
      oilAmountLiters: 0,
      filterChanged: false,
      intervalKm: 10_000,
      intervalMonths: 12,
      nextDueKm: 94_200,
      nextDueDate: "01.01.2027",
      notes: "",
      status: "aktuell",
    });

    expect(subtitle).not.toContain("0 l");
  });
});

describe("oilChangeRecordsFromDocuments", () => {
  it("applies custom interval to next due fields", () => {
    const records = oilChangeRecordsFromDocuments(
      [
        oilChangeDocument({
          id: "doc-1",
          mileage_km: 80_000,
          date: "2025-06-15",
        }),
      ],
      { intervalKm: 15_000, intervalMonths: 24 },
    );

    expect(records).toHaveLength(1);
    expect(records[0]?.intervalKm).toBe(15_000);
    expect(records[0]?.intervalMonths).toBe(24);
    expect(records[0]?.nextDueKm).toBe(95_000);
    expect(records[0]?.nextDueDate).toBe("15.06.2027");
  });
});
