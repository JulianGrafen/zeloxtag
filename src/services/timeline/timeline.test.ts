import { describe, expect, it } from "vitest";

import {
  TimelineEventSchema,
  mapVehicleEventRowToTimelineEvent,
} from "@/lib/validations/timelineSchema";
import type { Document } from "@/types/database";

import { deriveTimelineEventsFromDocuments } from "./derive-timeline-from-documents";
import {
  mergeTimelineEvents,
  sortTimelineEventsByMileage,
} from "./TimelineService";

function stubDocument(partial: Partial<Document> & Pick<Document, "id">): Document {
  return {
    id: partial.id,
    vehicle_id: partial.vehicle_id ?? "veh-1",
    user_id: partial.user_id ?? "user-1",
    created_by: partial.created_by ?? "user-1",
    title: partial.title ?? "Beleg",
    type: partial.type ?? "invoice",
    file_url: partial.file_url ?? "https://example.com/doc.pdf",
    vendor: partial.vendor ?? null,
    category: partial.category ?? null,
    line_items: partial.line_items ?? null,
    kba_number: partial.kba_number ?? null,
    vehicle_approvals: partial.vehicle_approvals ?? null,
    authority: partial.authority ?? null,
    conditions: partial.conditions ?? null,
    part_category: partial.part_category ?? null,
    notes: partial.notes ?? null,
    page_count: partial.page_count ?? 1,
    manufacturer: partial.manufacturer ?? null,
    invoice_number: partial.invoice_number ?? null,
    mileage_km: partial.mileage_km ?? null,
    technical_specs: partial.technical_specs ?? null,
    approval_fields: partial.approval_fields ?? null,
    amount: partial.amount ?? null,
    date: partial.date ?? "2024-06-01",
    created_at: partial.created_at ?? "2024-06-01T12:00:00.000Z",
  };
}

describe("TimelineEventSchema", () => {
  it("accepts a valid event", () => {
    const parsed = TimelineEventSchema.parse({
      id: "evt-1",
      vehicleId: "veh-1",
      mileage: 142_500,
      date: "2024-06-15",
      category: "oil_change",
      title: "Ölwechsel",
      description: null,
      cost: 189.9,
      documentId: "doc-1",
    });
    expect(parsed.mileage).toBe(142_500);
  });

  it("rejects invalid category", () => {
    const result = TimelineEventSchema.safeParse({
      id: "evt-1",
      vehicleId: "veh-1",
      mileage: 1000,
      date: "2024-01-01",
      category: "wash",
      title: "Waschstraße",
    });
    expect(result.success).toBe(false);
  });
});

describe("sortTimelineEventsByMileage", () => {
  it("sorts descending by mileage by default", () => {
    const sorted = sortTimelineEventsByMileage([
      {
        id: "a",
        vehicleId: "v",
        mileage: 80_000,
        date: "2023-01-01",
        category: "other",
        title: "A",
      },
      {
        id: "b",
        vehicleId: "v",
        mileage: 120_000,
        date: "2024-01-01",
        category: "other",
        title: "B",
      },
      {
        id: "c",
        vehicleId: "v",
        mileage: 95_000,
        date: "2023-06-01",
        category: "other",
        title: "C",
      },
    ]);
    expect(sorted.map((e) => e.mileage)).toEqual([120_000, 95_000, 80_000]);
  });

  it("sorts ascending when requested", () => {
    const sorted = sortTimelineEventsByMileage(
      [
        {
          id: "a",
          vehicleId: "v",
          mileage: 80_000,
          date: "2023-01-01",
          category: "other",
          title: "A",
        },
        {
          id: "b",
          vehicleId: "v",
          mileage: 120_000,
          date: "2024-01-01",
          category: "other",
          title: "B",
        },
      ],
      "asc",
    );
    expect(sorted.map((e) => e.mileage)).toEqual([80_000, 120_000]);
  });
});

describe("deriveTimelineEventsFromDocuments", () => {
  it("maps documents with mileage and skips missing KM", () => {
    const events = deriveTimelineEventsFromDocuments([
      stubDocument({
        id: "d1",
        title: "rourviverTTreparatur++ · Ölwechsel · CASTROL",
        vendor: "Auto Meister GmbH",
        category: "service",
        mileage_km: 67_210,
        amount: 220,
        notes: "Ölwechsel · CASTROL MAGNATEC 5W-40 · Filter unklar",
        line_items: [{ label: "Ölwechsel", amount: 220 }],
      }),
      stubDocument({
        id: "d2",
        title: "Ohne KM",
        mileage_km: null,
      }),
      stubDocument({
        id: "d3",
        title: "HU Prüfbericht",
        type: "tuev",
        category: "tuev",
        mileage_km: 70_000,
        vendor: "TÜV Süd",
        notes: "ind · Kreissp DE64. When nach 50Km nachziehen lassen !",
      }),
    ]);

    expect(events).toHaveLength(2);
    const oil = events.find((e) => e.documentId === "d1");
    expect(oil?.category).toBe("oil_change");
    expect(oil?.title).toBe("Ölwechsel");
    expect(oil?.description).toBe("Auto Meister GmbH");

    const tuev = events.find((e) => e.documentId === "d3");
    expect(tuev?.category).toBe("tuev");
    expect(tuev?.title).toBe("TÜV / HU");
    expect(tuev?.description).toBe("TÜV Süd");
  });

  it("uses TÜV approval_fields mileage for timeline when mileage_km is stale", () => {
    const events = deriveTimelineEventsFromDocuments([
      stubDocument({
        id: "d-tuev",
        type: "tuev",
        category: "tuev",
        mileage_km: 150_000,
        vendor: "DEKRA",
        approval_fields: {
          kind: "tuev",
          data: {
            testingOrganization: "DEKRA",
            testDate: "2021-03-23",
            result: "no_defects",
            mileageKm: 178_605,
            nextInspectionDate: "2024-03",
            documentNumber: null,
            defectsTable: null,
            defectsList: null,
          },
        },
      }),
    ]);

    expect(events).toHaveLength(1);
    expect(events[0]?.mileage).toBe(178_605);
  });
});

describe("mergeTimelineEvents", () => {
  it("prefers document-derived events for the same documentId", () => {
    const merged = mergeTimelineEvents(
      [
        {
          id: "stored-1",
          vehicleId: "v",
          mileage: 150_000,
          date: "2024-08-01",
          category: "tuev",
          title: "HU stale",
          documentId: "d3",
        },
      ],
      [
        {
          id: "doc-d3",
          vehicleId: "v",
          mileage: 178_605,
          date: "2021-03-23",
          category: "tuev",
          title: "HU Prüfbericht",
          documentId: "d3",
        },
      ],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.title).toBe("HU Prüfbericht");
    expect(merged[0]?.mileage).toBe(178_605);
  });
});

describe("mapVehicleEventRowToTimelineEvent", () => {
  it("maps snake_case rows including numeric cost strings", () => {
    const event = mapVehicleEventRowToTimelineEvent({
      id: "e1",
      vehicle_id: "v1",
      mileage: 10_000,
      date: "2024-01-02",
      category: "repair",
      title: "Bremse",
      description: null,
      cost: 350.5 as unknown as number,
      document_id: "d1",
    });
    expect(event.vehicleId).toBe("v1");
    expect(event.documentId).toBe("d1");
    expect(event.cost).toBe(350.5);
  });
});
