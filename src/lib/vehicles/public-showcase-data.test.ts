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
  expose_token: null,
  is_expose_active: false,
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
    expect(payload.modifications[0]).not.toHaveProperty("amount");
    expect(payload.profile.mileageKm).toBe(142000);
    expect(payload.profile.powerPs).toBe(320);
    expect(payload.profile.torqueNm).toBe(427);
    expect(payload.profile.displacementCc).toBe(2997);
    expect(payload.profile.drivetrain).toBe("Heckantrieb");
    expect(payload.profile.fuelType).toBe("Benzin");
    expect(payload.profile.transmission).toBe("6-Gang manuell");
  });

  it("exposes a sanitized Instagram handle and never VIN or owner id", () => {
    const vehicle: Vehicle = {
      ...baseVehicle,
      vin: "WBASECRET1234567",
      tech_specs: {
        ...((baseVehicle.tech_specs ?? {}) as Record<string, unknown>),
        instagramHandle: "@julian_f11",
      },
    };

    const payload = buildPublicShowcasePayload(vehicle, []);
    expect(payload.profile.instagramHandle).toBe("julian_f11");
    expect(JSON.stringify(payload)).not.toContain("WBASECRET");
    expect(JSON.stringify(payload)).not.toContain(vehicle.user_id);
  });

  it("includes tech spec notes on the public profile", () => {
    const vehicle: Vehicle = {
      ...baseVehicle,
      tech_specs: {
        ...((baseVehicle.tech_specs ?? {}) as Record<string, unknown>),
        notes: "Stage 2 · Walnuss-Lenkrad · Originalmotor",
      },
    };

    const payload = buildPublicShowcasePayload(vehicle, []);
    expect(payload.profile.notes).toBe("Stage 2 · Walnuss-Lenkrad · Originalmotor");
  });

  it("omits empty notes from the public profile", () => {
    const payload = buildPublicShowcasePayload(baseVehicle, []);
    expect(payload.profile.notes).toBeNull();
  });

  it("never exposes invoice amounts on the public showroom payload", () => {
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
    expect(payload.modifications[0]).not.toHaveProperty("amount");
    expect(JSON.stringify(payload)).not.toContain("480");
  });

  it("excludes documents not marked for public showcase", () => {
    const documents: Document[] = [
      baseInvoice({ show_on_public_showcase: false }),
    ];

    const payload = buildPublicShowcasePayload(baseVehicle, documents);
    expect(payload.modifications).toHaveLength(0);
    expect(payload.profile.mileageKm).toBeNull();
  });

  it("includes tuning invoice without line items via document fallback", () => {
    const documents: Document[] = [
      baseInvoice({
        line_items: null,
        title: "GReddy GT-Flügel",
        amount: 2380,
      }),
    ];

    const payload = buildPublicShowcasePayload(
      { ...baseVehicle, hide_financials: false },
      documents,
    );
    expect(payload.modifications).toHaveLength(1);
    expect(payload.modifications[0]?.label).toBe("GReddy GT-Flügel");
    expect(payload.modifications[0]).not.toHaveProperty("amount");
  });

  it("includes opted-in Umbau-Bilder stored as invoice + manual marker", () => {
    const documents: Document[] = [
      baseInvoice({
        id: "umbau-1",
        title: "Work Emotion CR Kiwami",
        invoice_number: "__manual__",
        file_url: "https://example.com/felgen.jpg",
        line_items: null,
        amount: null,
      }),
    ];

    const payload = buildPublicShowcasePayload(baseVehicle, documents);
    expect(payload.modifications).toHaveLength(1);
    expect(payload.modifications[0]?.label).toBe("Work Emotion CR Kiwami");
    expect(payload.modifications[0]?.source).toBe("manual");
    expect(payload.modifications[0]?.category).toBe("Umbauten");
  });

  it("includes only selected positions from an opted-in Umbau invoice", () => {
    const documents: Document[] = [
      baseInvoice({
        title: "Fahrwerk",
        line_items: [
          { label: "KW V3", amount: 1290, showOnPublicShowcase: true },
          { label: "H&R Stabilisator", amount: 320, showOnPublicShowcase: false },
        ],
      }),
    ];

    const payload = buildPublicShowcasePayload(baseVehicle, documents);
    expect(payload.modifications.map((mod) => mod.label)).toEqual(["KW V3"]);
  });

  it("includes opted-in invoices even when OCR category is not tuning", () => {
    const documents: Document[] = [
      baseInvoice({
        category: "repair",
        title: "KW Gewindefahrwerk",
        line_items: null,
      }),
    ];

    const payload = buildPublicShowcasePayload(baseVehicle, documents);
    expect(payload.modifications).toHaveLength(1);
    expect(payload.modifications[0]?.label).toBe("KW Gewindefahrwerk");
    expect(payload.modifications[0]?.source).toBe("invoice");
  });

  it("exposes the public dyno route when a Leistungsdiagramm is stored", () => {
    const vehicle: Vehicle = {
      ...baseVehicle,
      tech_specs: {
        ...((baseVehicle.tech_specs ?? {}) as Record<string, unknown>),
        dynoChartUrl:
          "https://example.supabase.co/storage/v1/object/public/vehicle-documents/11111111-1111-4111-8111-111111111111/dyno-chart.pdf?v=9",
      },
    };

    const payload = buildPublicShowcasePayload(vehicle, []);
    expect(payload.profile.dynoChartUrl).toBe(
      `/api/public/vehicle/${baseVehicle.id}/dyno-chart`,
    );
    expect(payload.profile.dynoChartIsImage).toBe(false);
  });

  it("marks an uploaded dyno photo as an image on the public profile", () => {
    const vehicle: Vehicle = {
      ...baseVehicle,
      tech_specs: {
        ...((baseVehicle.tech_specs ?? {}) as Record<string, unknown>),
        dynoChartUrl:
          "https://example.supabase.co/storage/v1/object/public/vehicle-documents/11111111-1111-4111-8111-111111111111/dyno-chart.jpg?v=9",
      },
    };

    const payload = buildPublicShowcasePayload(vehicle, []);
    expect(payload.profile.dynoChartUrl).toBe(
      `/api/public/vehicle/${baseVehicle.id}/dyno-chart`,
    );
    expect(payload.profile.dynoChartIsImage).toBe(true);
  });
});
