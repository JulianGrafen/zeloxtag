import { describe, expect, it } from "vitest";

import {
  collectAccountStoragePaths,
  collectVehicleDocumentPaths,
  collectVehicleDynoChartPaths,
  collectVehicleSilhouettePaths,
} from "@/lib/account/collect-account-storage-paths";
import type { Document, Vehicle } from "@/types/database";

const vehicleId = "11111111-1111-4111-8111-111111111111";
const documentId = "22222222-2222-4222-8222-222222222222";

function vehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: vehicleId,
    user_id: "33333333-3333-4333-8333-333333333333",
    make: "VW",
    model: "Golf",
    year: 2019,
    vin: null,
    tech_specs: {
      dynoChartUrl: `${vehicleId}/dyno-chart.pdf`,
    },
    silhouette_image_url: null,
    is_public: false,
    hide_financials: true,
    public_slug: null,
    expose_token: null,
    is_expose_active: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function document(fileUrl: string): Document {
  return {
    id: documentId,
    vehicle_id: vehicleId,
    user_id: "33333333-3333-4333-8333-333333333333",
    created_by: null,
    title: "Test",
    type: "invoice",
    file_url: fileUrl,
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
    mileage_km: null,
    technical_specs: null,
    approval_fields: null,
    amount: null,
    date: null,
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("collect account storage paths", () => {
  it("collects document storage paths and skips mock URLs", () => {
    const refs = collectVehicleDocumentPaths([
      document(`${vehicleId}/${documentId}-invoice.pdf`),
      document("mock://demo"),
      document("manual://entry"),
    ]);

    expect(refs).toEqual([
      {
        bucket: "vehicle-documents",
        path: `${vehicleId}/${documentId}-invoice.pdf`,
      },
    ]);
  });

  it("collects silhouette object paths", () => {
    const refs = collectVehicleSilhouettePaths(vehicleId);
    expect(refs).toHaveLength(1);
    expect(refs[0]?.path).toBe(`${vehicleId}/silhouette.png`);
    expect(refs[0]?.bucket).toBe("vehicle-silhouettes");
  });

  it("collects dyno chart paths from tech specs", () => {
    const refs = collectVehicleDynoChartPaths(vehicle());
    expect(refs).toEqual([
      {
        bucket: "vehicle-documents",
        path: `${vehicleId}/dyno-chart.pdf`,
      },
    ]);
  });

  it("deduplicates paths across vehicles and documents", () => {
    const refs = collectAccountStoragePaths({
      vehicles: [vehicle()],
      documents: [
        document(`${vehicleId}/${documentId}-invoice.pdf`),
        document(`${vehicleId}/${documentId}-invoice.pdf`),
      ],
    });

    const keys = refs.map((ref) => `${ref.bucket}:${ref.path}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain(
      `vehicle-documents:${vehicleId}/${documentId}-invoice.pdf`,
    );
    expect(keys).toContain(`vehicle-silhouettes:${vehicleId}/silhouette.png`);
    expect(keys).toContain(`vehicle-documents:${vehicleId}/dyno-chart.pdf`);
  });
});
