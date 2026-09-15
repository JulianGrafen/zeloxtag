import { describe, expect, it } from "vitest";

import { formatTimelineMileageKm } from "@/lib/vehicles/expose-pdf/formatters";
import type { TimelineEvent } from "@/lib/validations/timelineSchema";
import type { Document } from "@/types/database";

import { buildExposeMaintenanceRows } from "./build-expose-data";

const vehicleId = "11111111-1111-4111-8111-111111111111";

function timelineEvent(
  partial: Partial<TimelineEvent> & Pick<TimelineEvent, "id" | "category" | "date">,
): TimelineEvent {
  return {
    vehicleId,
    mileage: partial.mileage ?? 50_000,
    mileageKnown: partial.mileageKnown ?? true,
    title: partial.title ?? "Eintrag",
    description: partial.description ?? null,
    documentId: partial.documentId ?? null,
    ...partial,
  };
}

function doc(partial: Partial<Document> & Pick<Document, "id">): Document {
  return {
    vehicle_id: vehicleId,
    user_id: "user-1",
    created_by: "user-1",
    title: "Beleg",
    type: "invoice",
    file_url: "https://example.com/doc.pdf",
    vendor: null,
    category: null,
    line_items: null,
    kba_number: null,
    vehicle_approvals: null,
    authority: null,
    conditions: null,
    part_category: null,
    notes: null,
    page_count: 1,
    manufacturer: null,
    invoice_number: null,
    mileage_km: null,
    technical_specs: null,
    approval_fields: null,
    amount: null,
    date: "2024-06-01",
    created_at: "2024-06-01T12:00:00.000Z",
    ...partial,
  };
}

describe("buildExposeMaintenanceRows", () => {
  it("includes all maintenance events without a 14-row cap", () => {
    const events: TimelineEvent[] = [];
    for (let i = 0; i < 20; i += 1) {
      events.push(
        timelineEvent({
          id: `evt-${i}`,
          category: "inspection",
          date: `2024-${String((i % 12) + 1).padStart(2, "0")}-15`,
          mileage: 10_000 + i * 1000,
        }),
      );
    }
    events.push(
      timelineEvent({
        id: "mod-1",
        category: "part_install",
        date: "2025-01-01",
        title: "KW Fahrwerk",
      }),
    );

    const rows = buildExposeMaintenanceRows(events, []);
    expect(rows).toHaveLength(20);
    expect(rows.some((row) => row.service.includes("Umbau"))).toBe(false);
  });

  it("sorts by date descending", () => {
    const rows = buildExposeMaintenanceRows(
      [
        timelineEvent({
          id: "old",
          category: "repair",
          date: "2023-01-01",
          mileage: 40_000,
        }),
        timelineEvent({
          id: "new",
          category: "oil_change",
          date: "2025-06-01",
          mileage: 80_000,
        }),
      ],
      [],
    );

    expect(rows[0]?.date).toBe("01.06.2025");
    expect(rows[1]?.date).toBe("01.01.2023");
  });

  it("maps TÜV approval_fields to German status labels", () => {
    const tuevDocument = doc({
      id: "tuev-1",
      type: "tuev",
      category: "tuev",
      vendor: "DEKRA",
      approval_fields: {
        kind: "tuev",
        data: {
          testingOrganization: "DEKRA",
          testDate: "2024-08-01",
          result: "no_defects",
          mileageKm: 70_000,
          nextInspectionDate: "2026-08",
          documentNumber: null,
          defectsTable: null,
          defectsList: null,
        },
      },
    });

    const rows = buildExposeMaintenanceRows(
      [
        timelineEvent({
          id: "evt-tuev",
          category: "tuev",
          date: "2024-08-01",
          documentId: "tuev-1",
          mileage: 70_000,
        }),
      ],
      [tuevDocument],
    );

    expect(rows[0]?.tuevStatus).toBe("Ohne Mängel");
    expect(rows[0]?.workshop).toBe("DEKRA");
  });

  it("marks unknown mileage for display", () => {
    const rows = buildExposeMaintenanceRows(
      [
        timelineEvent({
          id: "manual",
          category: "inspection",
          date: "2024-03-10",
          mileage: 0,
          mileageKnown: false,
          isManualEntry: true,
          title: "Bremsflüssigkeit erneuert",
        }),
      ],
      [],
    );

    expect(rows[0]?.mileageKnown).toBe(false);
    expect(formatTimelineMileageKm(rows[0]?.mileageKm, rows[0]?.mileageKnown)).toBe(
      "—",
    );
    expect(rows[0]?.service).toBe("Bremsflüssigkeit erneuert");
  });
});
