import { describe, expect, it } from "vitest";

import type { ExposePdfData } from "./types";
import { renderExposePdfBuffer } from "./render-expose-pdf";

const minimalQr =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const minimalData: ExposePdfData = {
  generatedAt: "2026-01-01T00:00:00.000Z",
  vehicleTitle: "BMW M2",
  vehicleSubtitle: "Test",
  publicProfileUrl: "https://zeloxtag.com/v/demo",
  qrCodeDataUri: minimalQr,
  hideFinancials: true,
  sellerContact: "test@example.com",
  metrics: {
    powerLabel: "410 PS",
    mileageLabel: "62.000 km",
    yearLabel: "2018",
    modificationValueLabel: "",
    maintenanceValueLabel: "",
    documentedTotalLabel: "",
  },
  specs: {
    vin: "—",
    hsnTsn: "—",
    engine: "—",
    gearbox: "—",
    fuel: "—",
    color: "—",
    previousOwners: "—",
    drivetrain: "—",
    bodyType: "—",
    torqueLabel: "—",
  },
  latestTuevStatus: "Kein TÜV-Beleg hinterlegt",
  maintenanceRows: Array.from({ length: 18 }, (_, index) => ({
    date: `15.${String(index + 1).padStart(2, "0")}.2024`,
    mileageKm: 50_000 + index * 500,
    mileageKnown: true,
    workshop: "Werkstatt",
    service: "Inspektion",
    tuevStatus: "—",
    amount: null,
  })),
  modifications: [],
  modificationTotal: null,
  maintenanceTotal: null,
  documentedTotal: null,
  heroImage: null,
  galleryImages: [],
  dynoChartImage: null,
  dynoChartPdfNote: null,
};

describe("renderExposePdfBuffer", () => {
  it("produces a valid PDF with paginated maintenance history", async () => {
    const buffer = await renderExposePdfBuffer(minimalData);
    expect(buffer.length).toBeGreaterThan(2_000);
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
