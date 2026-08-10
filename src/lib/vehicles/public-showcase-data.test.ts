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
  tech_specs: {
    powerPs: 320,
    powerKw: 235,
    torqueNm: 427,
    engine: "2JZ-GTE",
    displacementCc: 2997,
    fuelType: "Benzin",
    transmission: "6-Gang manuell",
    drivetrain: "Heckantrieb",
    bodyType: "Coupé",
    color: "Velocity Red",
    dynoChartUrl: null,
  },
  silhouette_image_url: null,
  is_public: true,
  hide_financials: true,
  public_slug: "abc123XYZ",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function baseInvoice(overrides: Partial<Document> = {}): Document {
  return {
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
    show_on_public_showcase: true,
    created_at: "2026-03-01T00:00:00Z",
    ...overrides,
  };
}

describe("buildPublicShowcasePayload", () => {
  it("hides financial amounts when hide_financials is true", () => {
    const documents: Document[] = [baseInvoice()];

    const payload = buildPublicShowcasePayload(baseVehicle, documents);
    expect(payload.profile.hideFinancials).toBe(true);
    expect(payload.modifications[0]?.amount).toBeNull();
    expect(payload.profile.mileageKm).toBe(142000);
    expect(payload.profile.powerPs).toBe(320);
    expect(payload.profile.torqueNm).toBe(427);
    expect(payload.profile.displacementCc).toBe(2997);
    expect(payload.profile.drivetrain).toBe("Heckantrieb");
    expect(payload.profile.fuelType).toBe("Benzin");
    expect(payload.profile.transmission).toBe("6-Gang manuell");
  });

  it("shows amounts when hide_financials is false", () => {
    const vehicle = { ...baseVehicle, hide_financials: false };
    const documents: Document[] = [
      baseInvoice({
        id: "doc-2",
        title: "Federn",
        line_items: [{ label: "H&R Sportfedern", amount: 480 }],
        invoice_number: "RE-2",
        mileage_km: null,
        amount: 480,
        date: "2026-02-01",
        created_at: "2026-02-01T00:00:00Z",
      }),
    ];

    const payload = buildPublicShowcasePayload(vehicle, documents);
    expect(payload.modifications[0]?.amount).toBe(480);
  });

  it("excludes documents not marked for public showcase", () => {
    const documents: Document[] = [
      baseInvoice({ show_on_public_showcase: false }),
    ];

    const payload = buildPublicShowcasePayload(baseVehicle, documents);
    expect(payload.modifications).toHaveLength(0);
    expect(payload.profile.mileageKm).toBeNull();
  });
});
