import { describe, expect, it } from "vitest";

import {
  compareShowcaseGalleryDocuments,
  SHOWCASE_GALLERY_MARKER,
} from "@/lib/documents/showcase-gallery";
import type { Document } from "@/types/database";

function galleryDoc(
  partial: Pick<Document, "id" | "amount" | "created_at">,
): Document {
  return {
    id: partial.id,
    amount: partial.amount,
    created_at: partial.created_at,
    vehicle_id: "vehicle-1",
    user_id: "user-1",
    created_by: "user-1",
    title: "Galerie",
    type: "other",
    file_url: "path/photo.jpg",
    vendor: null,
    category: "showcase_gallery",
    line_items: null,
    kba_number: null,
    vehicle_approvals: null,
    authority: null,
    conditions: null,
    part_category: null,
    notes: null,
    page_count: 1,
    manufacturer: null,
    invoice_number: SHOWCASE_GALLERY_MARKER,
    mileage_km: null,
    technical_specs: null,
    approval_fields: null,
    date: null,
    show_on_public_showcase: true,
    updated_at: partial.created_at,
  } as Document;
}

describe("compareShowcaseGalleryDocuments", () => {
  it("orders by amount when present", () => {
    const docs = [
      galleryDoc({ id: "b", amount: 2, created_at: "2026-01-02T00:00:00Z" }),
      galleryDoc({ id: "a", amount: 1, created_at: "2026-01-03T00:00:00Z" }),
    ].sort(compareShowcaseGalleryDocuments);

    expect(docs.map((doc) => doc.id)).toEqual(["a", "b"]);
  });

  it("falls back to created_at when amount is missing", () => {
    const docs = [
      galleryDoc({ id: "new", amount: null, created_at: "2026-02-01T00:00:00Z" }),
      galleryDoc({ id: "old", amount: null, created_at: "2026-01-01T00:00:00Z" }),
    ].sort(compareShowcaseGalleryDocuments);

    expect(docs.map((doc) => doc.id)).toEqual(["old", "new"]);
  });
});
