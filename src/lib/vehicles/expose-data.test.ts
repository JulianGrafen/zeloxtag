import { describe, expect, it } from "vitest";

import type { TimelineEvent } from "@/lib/validations/timelineSchema";
import type { Document, Vehicle } from "@/types/database";

import { buildExposeData, sanitizeExposeLabel } from "./expose-data";

const vehicle: Vehicle = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  make: "BMW",
  model: "M2",
  year: 2018,
  vin: "WBSSECRET12345678",
  tech_specs: { notes: "Privat: Garage hinten links" },
  silhouette_image_url: null,
  is_public: false,
  hide_financials: true,
  public_slug: null,
  expose_token: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  is_expose_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function invoice(overrides: Partial<Document> = {}): Document {
  return {
    id: "doc-inv-1",
    vehicle_id: vehicle.id,
    user_id: vehicle.user_id,
    created_by: vehicle.user_id,
    title: "KW Gewindefahrwerk",
    type: "invoice",
    file_url: "https://example.com/secret.pdf",
    vendor: "KW Automotive",
    category: "tuning",
    line_items: [{ label: "KW V3", amount: 1890 }],
    kba_number: null,
    vehicle_approvals: null,
    authority: null,
    conditions: null,
    part_category: null,
    notes: "IBAN DE89370400440532013000 bitte überweisen",
    page_count: null,
    manufacturer: "KW",
    invoice_number: "RE-SECRET",
    mileage_km: 62000,
    technical_specs: null,
    approval_fields: null,
    amount: 1890,
    date: "2026-04-01",
    created_at: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

function tuevDoc(): Document {
  return invoice({
    id: "doc-tuev",
    title: "Hauptuntersuchung",
    type: "tuev",
    category: "tuev",
    vendor: "TÜV Süd",
    line_items: null,
    amount: 140,
    date: "2026-02-10",
    mileage_km: 61000,
    approval_fields: null,
    created_at: "2026-02-10T00:00:00Z",
  });
}

function oilDoc(): Document {
  return invoice({
    id: "doc-oil",
    title: "Ölwechsel 5W-30",
    category: "service",
    vendor: "Autohaus Nord",
    line_items: [{ label: "Ölwechsel inkl. Filter", amount: 220 }],
    amount: 220,
    date: "2026-03-15",
    mileage_km: 61500,
    created_at: "2026-03-15T00:00:00Z",
  });
}

const timeline: TimelineEvent[] = [
  {
    id: "ev-1",
    vehicleId: vehicle.id,
    mileage: 62000,
    date: "2026-04-01",
    category: "part_install",
    title: "Teile / Umbau",
    description: "Nicht öffentlich",
    cost: 1890,
    documentId: "doc-inv-1",
  },
  {
    id: "ev-2",
    vehicleId: vehicle.id,
    mileage: 61500,
    date: "2026-03-15",
    category: "oil_change",
    title: "Ölwechsel",
    documentId: "doc-oil",
  },
];

describe("sanitizeExposeLabel", () => {
  it("drops IBAN, account hints, and street addresses", () => {
    expect(sanitizeExposeLabel("DE89370400440532013000")).toBeNull();
    expect(sanitizeExposeLabel("Bitte IBAN überweisen")).toBeNull();
    expect(sanitizeExposeLabel("Musterstraße 12, 80331 München")).toBeNull();
    expect(sanitizeExposeLabel("KW Automotive")).toBe("KW Automotive");
  });
});

describe("buildExposeData", () => {
  it("sums confirmed invoices and lists sanitized line items", () => {
    const data = buildExposeData(vehicle, [invoice(), oilDoc(), tuevDoc()], timeline);

    expect(data.investmentTotal).toBe(2110);
    expect(data.investmentItems.map((item) => item.partName)).toEqual([
      "KW V3",
      "Ölwechsel inkl. Filter",
    ]);
    expect(data.investmentItems[0]?.workshop).toBe("KW Automotive");
    expect(data.serviceCount).toBe(1);
    expect(data.lastOilChangeDate).toBe("2026-03-15");
    expect(data.lastTuevDate).toBe("2026-02-10");
    expect(data.lastTuevStatus).toBe("HU durchgeführt");
    expect(data.documentCount).toBe(3);
    expect(data.mileageKm).toBe(62000);
    expect(data.firstRegistrationYear).toBe(2018);
  });

  it("never leaks VIN, owner id, notes, IBAN, or invoice files", () => {
    const data = buildExposeData(
      vehicle,
      [
        invoice({
          vendor: "IBAN DE89370400440532013000",
          manufacturer: null,
          title: "Rechnung",
        }),
      ],
      timeline,
    );
    const serialized = JSON.stringify(data);

    expect(serialized).not.toContain("WBSSECRET");
    expect(serialized).not.toContain(vehicle.user_id);
    expect(serialized).not.toContain("Garage hinten");
    expect(serialized).not.toContain("DE89370400440532013000");
    expect(serialized).not.toContain("secret.pdf");
    expect(serialized).not.toContain("RE-SECRET");
    expect(serialized).not.toContain("Nicht öffentlich");
    expect(serialized).not.toContain(vehicle.expose_token);
    expect(data.investmentItems[0]?.workshop).toBeNull();
  });

  it("ignores invoices without a confirmed amount", () => {
    const draft = invoice({
      id: "draft",
      amount: null,
      line_items: null,
    });
    const data = buildExposeData(vehicle, [draft], []);
    expect(data.investmentTotal).toBeNull();
    expect(data.investmentItems).toHaveLength(0);
  });

  it("sorts the timeline newest-first and maps kinds", () => {
    const data = buildExposeData(vehicle, [invoice(), oilDoc()], timeline);
    expect(data.timeline.map((entry) => entry.date)).toEqual([
      "2026-04-01",
      "2026-03-15",
    ]);
    expect(data.timeline[0]?.kind).toBe("modification");
    expect(data.timeline[0]?.kindLabel).toBe("Modifikation");
    expect(data.timeline[0]?.parts).toBe("KW V3");
    expect(data.timeline[1]?.kind).toBe("service");
  });
});
