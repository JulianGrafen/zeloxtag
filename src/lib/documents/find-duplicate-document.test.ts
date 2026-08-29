import { describe, expect, it } from "vitest";

import {
  buildDuplicateDocumentHint,
  documentPageHash,
  findDuplicateDocument,
} from "@/lib/documents/find-duplicate-document";
import type { Document } from "@/types/database";

function buildDoc(overrides: Partial<Document> = {}): Document {
  return {
    id: "existing-1",
    vehicle_id: "veh-1",
    user_id: "user-1",
    created_by: "user-1",
    title: "Service",
    type: "invoice",
    file_url: "https://example.com/a.pdf",
    vendor: "Werkstatt Süd",
    category: "service",
    line_items: null,
    kba_number: null,
    vehicle_approvals: null,
    authority: null,
    conditions: null,
    part_category: null,
    notes: "pageHash:abc123def4567890",
    page_count: 1,
    manufacturer: null,
    invoice_number: null,
    mileage_km: null,
    technical_specs: null,
    approval_fields: null,
    amount: 659.78,
    date: "2026-01-15",
    created_at: "2026-01-15T10:00:00.000Z",
    ...overrides,
  };
}

describe("findDuplicateDocument", () => {
  it("matches exact PDF hash even when OCR metadata differs", () => {
    const bytes = Buffer.from("same-pdf-bytes");
    const pageHash = documentPageHash(bytes);

    const match = findDuplicateDocument(
      [buildDoc({ notes: `pageHash:${pageHash}` })],
      {
        vehicleId: "veh-1",
        type: "invoice",
        title: "Other title",
        vendor: null,
        date: null,
        amount: null,
        pageHash,
      },
    );

    expect(match?.id).toBe("existing-1");
  });

  it("does not treat missing date and amount as duplicate evidence", () => {
    const match = findDuplicateDocument(
      [
        buildDoc({
          date: null,
          amount: null,
          vendor: null,
          notes: null,
        }),
      ],
      {
        vehicleId: "veh-1",
        type: "invoice",
        title: "Neuer Beleg",
        vendor: null,
        date: null,
        amount: null,
        pageHash: "different-hash-001",
      },
    );

    expect(match).toBeNull();
  });

  it("matches fuzzy duplicate only when date and amount both match", () => {
    const match = findDuplicateDocument([buildDoc()], {
      vehicleId: "veh-1",
      type: "invoice",
      title: "Service",
      vendor: "Werkstatt Süd GmbH",
      date: "2026-01-15",
      amount: 659.78,
      pageHash: "new-scan-hash",
    });

    expect(match?.id).toBe("existing-1");
  });

  it("does not fuzzy-match when only amount matches", () => {
    const match = findDuplicateDocument([buildDoc()], {
      vehicleId: "veh-1",
      type: "invoice",
      title: "Service",
      vendor: "Werkstatt Süd GmbH",
      date: null,
      amount: 659.78,
      pageHash: "new-scan-hash",
    });

    expect(match).toBeNull();
  });

  it("does not fuzzy-match when only date matches", () => {
    const match = findDuplicateDocument([buildDoc()], {
      vehicleId: "veh-1",
      type: "invoice",
      title: "Service",
      vendor: "Werkstatt Süd GmbH",
      date: "2026-01-15",
      amount: null,
      pageHash: "new-scan-hash",
    });

    expect(match).toBeNull();
  });
});

describe("buildDuplicateDocumentHint", () => {
  it("names the existing Beleg for the confirmation prompt", () => {
    expect(
      buildDuplicateDocumentHint(
        buildDoc({ title: "Sportfedern H&R", date: "2026-01-15" }),
      ),
    ).toContain("Sportfedern H&R");
  });
});
