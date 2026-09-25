import { describe, expect, it } from "vitest";

import type { Document } from "@/types/database";

import {
  estimateDueDateFromKm,
  estimateKmPerDayFromDocuments,
  mileageSamplesFromDocuments,
} from "./mileage-velocity";

function doc(partial: Partial<Document> & { id: string }): Document {
  return {
    id: partial.id,
    vehicle_id: "v1",
    user_id: "u1",
    created_by: null,
    title: "Test",
    type: "invoice",
    file_url: "x",
    vendor: null,
    category: null,
    line_items: null,
    kba_number: null,
    vehicle_approvals: null,
    authority: null,
    conditions: null,
    part_category: null,
    notes: null,
    page_count: null,
    manufacturer: null,
    invoice_number: null,
    mileage_km: partial.mileage_km ?? null,
    technical_specs: null,
    approval_fields: null,
    amount: null,
    date: partial.date ?? null,
    created_at: partial.created_at ?? "2026-01-01T00:00:00Z",
  };
}

describe("estimateKmPerDayFromDocuments", () => {
  it("returns median km/day across segments", () => {
    const documents = [
      doc({ id: "1", date: "2026-01-01", mileage_km: 10_000 }),
      doc({ id: "2", date: "2026-02-01", mileage_km: 11_000 }),
      doc({ id: "3", date: "2026-03-01", mileage_km: 12_000 }),
    ];
    const rate = estimateKmPerDayFromDocuments(documents);
    expect(rate).toBeGreaterThan(30);
    expect(rate).toBeLessThan(40);
  });

  it("returns null with fewer than two samples", () => {
    expect(
      estimateKmPerDayFromDocuments([
        doc({ id: "1", date: "2026-01-01", mileage_km: 10_000 }),
      ]),
    ).toBeNull();
  });
});

describe("estimateDueDateFromKm", () => {
  it("projects days until target mileage", () => {
    const due = estimateDueDateFromKm({
      referenceIsoDate: "2026-01-01",
      referenceMileageKm: 80_000,
      targetMileageKm: 90_000,
      kmPerDay: 50,
    });
    expect(due).toBe("2026-07-20");
  });
});

describe("mileageSamplesFromDocuments", () => {
  it("dedupes same-day samples keeping max km", () => {
    const samples = mileageSamplesFromDocuments([
      doc({ id: "1", date: "2026-01-01", mileage_km: 10_000 }),
      doc({ id: "2", date: "2026-01-01", mileage_km: 10_050 }),
    ]);
    expect(samples).toHaveLength(1);
    expect(samples[0]?.mileageKm).toBe(10_050);
  });
});
