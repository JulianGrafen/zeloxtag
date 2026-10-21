import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getMockUploadedDocuments: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/documents/mock-uploads", () => ({
  getMockUploadedDocuments: mocks.getMockUploadedDocuments,
}));

import { getDocumentById } from "@/lib/tags/get-tag-by-uuid";
import { MOCK_DEMO_VEHICLE_ID } from "@/lib/tags/mock-tags";

describe("getDocumentById demo catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMockUploadedDocuments.mockResolvedValue([]);
    mocks.createClient.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }),
    });
  });

  it("returns mock ABE document with approval fields for demo vehicle", async () => {
    const doc = await getDocumentById(MOCK_DEMO_VEHICLE_ID, "doc_abe_1");
    expect(doc).not.toBeNull();
    expect(doc?.title).toBe("M-Tech Frontspoiler");
    expect(doc?.approval_fields?.kind).toBe("teilegutachten");
    expect(doc?.file_url).toBe("/demo/abe-frontlippe.pdf");
  });

  it("returns mock invoice with line items for demo vehicle", async () => {
    const doc = await getDocumentById(MOCK_DEMO_VEHICLE_ID, "doc_invoice_1");
    expect(doc).not.toBeNull();
    expect(doc?.line_items?.length).toBeGreaterThan(0);
    expect(doc?.amount).toBe(415.3);
  });
});
