import { describe, expect, it } from "vitest";

import { buildPublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";
import type { Document, Vehicle } from "@/types/database";

const baseVehicle: Vehicle = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  make: "Toyota",
  model: "Supra",
  year: 1998,
  vin: null,
  tech_specs: { powerPs: 320, engine: "2JZ-GTE", dynoChartUrl: null },
  silhouette_image_url: null,
  is_public: true,
  hide_financials: true,
  public_slug: "abc123XYZ",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("buildPublicShowcasePayload", () => {
  it("hides financial amounts when hide_financials is true", () => {
    const documents: Document[] = [
      {
        id: "doc-1",
        vehicle_id: baseVehicle.id,
        user_id: baseVehicle.user_id,
        created_by: baseVehicle.user_id,
        title: "Sportauspuff",
        type: "invoice",
        file_url: "https://example.com/x.pdf",
        vendor: "Werkstatt Süd",
        category: "tuning",
        line_items: [{ label: "Akrapovic Auspuff", amount: 2400 }],
        kba_number: null,
        vehicle_approvals: null,
        authority: null,
        conditions: null,
        part_category: null,
        notes: null,
        page_count: null,
        manufacturer: null,
        invoice_number: "RE-1",
        mileage_km: 142000,
        technical_specs: null,
        approval_fields: null,
        amount: 2400,
        date: "2026-03-01",
        created_at: "2026-03-01T00:00:00Z",
      },
    ];

    const payload = buildPublicShowcasePayload(baseVehicle, documents);
    expect(payload.profile.hideFinancials).toBe(true);
    expect(payload.modifications[0]?.amount).toBeNull();
    expect(payload.profile.mileageKm).toBe(142000);
    expect(payload.profile.powerPs).toBe(320);
  });

  it("shows amounts when hide_financials is false", () => {
    const vehicle = { ...baseVehicle, hide_financials: false };
    const documents: Document[] = [
      {
        id: "doc-2",
        vehicle_id: vehicle.id,
        user_id: vehicle.user_id,
        created_by: vehicle.user_id,
        title: "Federn",
        type: "invoice",
        file_url: "https://example.com/y.pdf",
        vendor: "Tuner",
        category: "tuning",
        line_items: [{ label: "H&R Sportfedern", amount: 480 }],
        kba_number: null,
        vehicle_approvals: null,
        authority: null,
        conditions: null,
        part_category: null,
        notes: null,
        page_count: null,
        manufacturer: null,
        invoice_number: "RE-2",
        mileage_km: null,
        technical_specs: null,
        approval_fields: null,
        amount: 480,
        date: "2026-02-01",
        created_at: "2026-02-01T00:00:00Z",
      },
    ];

    const payload = buildPublicShowcasePayload(vehicle, documents);
    expect(payload.modifications[0]?.amount).toBe(480);
  });
});
