import { describe, expect, it } from "vitest";

import {
  countBuildStoryChronikDocuments,
  countBuildStoryEligibleDocuments,
  listOwnerBuildStoryPreviewEntries,
} from "@/lib/vehicles/build-story-owner-entries";
import type { Document } from "@/types/database";

function manualUmbauDoc(
  overrides: Partial<Document> = {},
): Document {
  return {
    id: "doc-1",
    vehicle_id: "veh-1",
    user_id: "user-1",
    created_by: null,
    title: "Intercooler",
    type: "invoice",
    file_url: "vehicles/v/photo.jpg",
    vendor: null,
    category: "tuning",
    line_items: null,
    notes: null,
    invoice_number: "__manual__",
    mileage_km: 120_000,
    amount: null,
    date: "2024-06-01",
    show_on_public_showcase: true,
    show_on_build_story: true,
    created_at: "2024-06-01T00:00:00Z",
    ...overrides,
  } as Document;
}

describe("build-story-owner-entries", () => {
  it("counts eligible and chronik documents", () => {
    const docs = [
      manualUmbauDoc(),
      manualUmbauDoc({
        id: "doc-2",
        show_on_build_story: false,
        file_url: "manual://no-image",
      }),
    ];
    expect(countBuildStoryEligibleDocuments(docs)).toBe(1);
    expect(countBuildStoryChronikDocuments(docs)).toBe(1);
  });

  it("maps owner preview entries with showcase-file URLs", () => {
    const entries = listOwnerBuildStoryPreviewEntries("veh-1", [
      manualUmbauDoc(),
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.imageSrc).toContain("/api/vehicle/veh-1/showcase-file");
  });
});
