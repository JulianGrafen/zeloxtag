import { describe, expect, it } from "vitest";

import type { Document } from "@/types/database";

import { MANUAL_ENTRY_MARKER } from "./manual-entries";
import {
  documentEligibleForChronikPhotoPreview,
  documentHasTimelinePreview,
  resolveTimelineEventImageUrl,
} from "./timeline-event-image";

function stubDoc(partial: Partial<Document> & Pick<Document, "id">): Document {
  return {
    id: partial.id,
    vehicle_id: partial.vehicle_id ?? "veh-1",
    user_id: partial.user_id ?? "user-1",
    created_by: partial.created_by ?? "user-1",
    title: partial.title ?? "Foto",
    type: partial.type ?? "invoice",
    file_url: partial.file_url ?? "",
    vendor: partial.vendor ?? null,
    category: partial.category ?? "tuning",
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
    date: partial.date ?? "2024-01-01",
    created_at: partial.created_at ?? "2024-01-01T00:00:00.000Z",
  };
}

describe("resolveTimelineEventImageUrl", () => {
  it("returns proxy URL for manual Umbau storage images", () => {
    const path =
      "a0b1c2d3-e4f5-4678-89ab-cdef01234567/b1c2d3e4-f5a6-4789-abcd-ef0123456789-photo.webp";
    const url = resolveTimelineEventImageUrl(
      stubDoc({
        id: "doc-1",
        file_url: path,
        category: "tuning",
        invoice_number: MANUAL_ENTRY_MARKER,
      }),
    );
    expect(url).toContain("/api/documents/file?");
    expect(url).toContain(encodeURIComponent(path));
  });

  it("ignores scanned invoice images", () => {
    const path =
      "a0b1c2d3-e4f5-4678-89ab-cdef01234567/b1c2d3e4-f5a6-4789-abcd-ef0123456789-photo.webp";
    expect(
      resolveTimelineEventImageUrl(
        stubDoc({ id: "doc-scan", file_url: path, category: "tuning" }),
      ),
    ).toBeNull();
  });

  it("ignores PDFs and manual placeholders for direct image URL", () => {
    expect(
      resolveTimelineEventImageUrl(
        stubDoc({ id: "doc-2", file_url: "manual://entry/doc-2" }),
      ),
    ).toBeNull();
    expect(
      resolveTimelineEventImageUrl(
        stubDoc({
          id: "doc-3",
          file_url:
            "a0b1c2d3-e4f5-4678-89ab-cdef01234567/b1c2d3e4-f5a6-4789-abcd-ef0123456789-scan.pdf",
        }),
      ),
    ).toBeNull();
  });

  it("flags manual Umbau PDFs and images for chronik preview", () => {
    expect(
      documentHasTimelinePreview(
        stubDoc({
          id: "doc-4",
          file_url:
            "a0b1c2d3-e4f5-4678-89ab-cdef01234567/b1c2d3e4-f5a6-4789-abcd-ef0123456789-scan.pdf",
          category: "tuning",
          invoice_number: MANUAL_ENTRY_MARKER,
        }),
      ),
    ).toBe(true);
    expect(
      documentHasTimelinePreview(
        stubDoc({
          id: "doc-scan-pdf",
          file_url:
            "a0b1c2d3-e4f5-4678-89ab-cdef01234567/b1c2d3e4-f5a6-4789-abcd-ef0123456789-scan.pdf",
          category: "tuning",
        }),
      ),
    ).toBe(false);
    expect(
      documentHasTimelinePreview(
        stubDoc({ id: "doc-5", file_url: "manual://entry/doc-5" }),
      ),
    ).toBe(false);
  });

  it("excludes manual service entries without tuning category", () => {
    expect(
      documentEligibleForChronikPhotoPreview(
        stubDoc({
          id: "doc-6",
          category: "service",
          invoice_number: MANUAL_ENTRY_MARKER,
        }),
      ),
    ).toBe(false);
  });
});
