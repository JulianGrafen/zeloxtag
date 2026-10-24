import { describe, expect, it } from "vitest";

import type { ServiceRecord } from "./service-record";
import { buildServiceMaintenanceTileMeta, pickUrgentServiceAlert } from "./service-due-priority";

function record(partial: Partial<ServiceRecord> & Pick<ServiceRecord, "category">): ServiceRecord {
  return {
    id: "1",
    vehicleId: "v1",
    category: partial.category,
    title: partial.title ?? "Test",
    date: partial.date ?? "2025-01-01",
    mileage: partial.mileage ?? 50_000,
    performedBy: null,
    notes: null,
    invoiceDocumentId: null,
    nextIntervalMileage: partial.nextIntervalMileage ?? null,
    nextIntervalDate: partial.nextIntervalDate ?? null,
    showOnPublicShowcase: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    source: "database",
    ...partial,
  };
}

describe("pickUrgentServiceAlert", () => {
  it("flags service due within 1500 km", () => {
    const alert = pickUrgentServiceAlert(
      [
        record({
          category: "brakes_front",
          nextIntervalMileage: 51_000,
        }),
      ],
      { currentMileageKm: 50_000, now: new Date("2025-06-01T12:00:00Z") },
    );
    expect(alert?.tone).toBe("warning");
    expect(alert?.label).toContain("1.000 km");
  });
});

describe("buildServiceMaintenanceTileMeta", () => {
  it("falls back to last service subtitle", () => {
    const meta = buildServiceMaintenanceTileMeta(
      [
        record({
          category: "oil_change",
          title: "Ölwechsel",
          mileage: 40_000,
        }),
      ],
      { currentMileageKm: 42_400 },
    );
    expect(meta.subtitle).toContain("2.400 km");
  });
});
