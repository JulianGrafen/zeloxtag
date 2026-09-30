import { describe, expect, it } from "vitest";

import {
  filterCostOverviewDocuments,
  filterInvoiceReceiptDocuments,
  isCostOverviewDocument,
  isInvoiceReceiptDocument,
} from "@/lib/documents/invoice-receipts";
import type { Document } from "@/types/database";

function buildInvoiceDoc(
  overrides: Partial<Document> = {},
): Document {
  return {
    id: "doc-1",
    vehicle_id: "veh-1",
    user_id: "user-1",
    created_by: "user-1",
    title: "Sportfedern",
    type: "invoice",
    file_url: "https://example.com/invoice.pdf",
    vendor: "Speedworkz",
    category: "repair",
    line_items: [{ label: "Arbeitslohn", amount: 120 }],
    kba_number: null,
    vehicle_approvals: null,
    authority: null,
    conditions: null,
    part_category: null,
    notes: null,
    page_count: 1,
    manufacturer: null,
    invoice_number: "RE-100",
    mileage_km: 142350,
    technical_specs: null,
    approval_fields: null,
    amount: 600,
    date: "2026-01-15",
    created_at: "2026-01-15T10:00:00.000Z",
    ...overrides,
  };
}

describe("isInvoiceReceiptDocument", () => {
  it("includes scanned invoice receipts for Belege categories", () => {
    expect(isInvoiceReceiptDocument(buildInvoiceDoc({ category: "repair" }))).toBe(
      true,
    );
    expect(isInvoiceReceiptDocument(buildInvoiceDoc({ category: "service" }))).toBe(
      true,
    );
    expect(isInvoiceReceiptDocument(buildInvoiceDoc({ category: "tuning" }))).toBe(
      true,
    );
  });

  it("excludes non-invoice types and tuev-category rows", () => {
    expect(isInvoiceReceiptDocument(buildInvoiceDoc({ type: "tuev" }))).toBe(
      false,
    );
    expect(
      isInvoiceReceiptDocument(buildInvoiceDoc({ type: "invoice", category: "tuev" })),
    ).toBe(false);
  });

  it("includes manual entries in Belege sum and list", () => {
    expect(
      isInvoiceReceiptDocument(
        buildInvoiceDoc({
          invoice_number: "__manual__",
          file_url: "manual://entry",
          category: "tuning",
        }),
      ),
    ).toBe(true);
  });
});

describe("isCostOverviewDocument", () => {
  it("includes manual entries for investment overview", () => {
    expect(
      isCostOverviewDocument(
        buildInvoiceDoc({
          invoice_number: "__manual__",
          file_url: "manual://entry",
          category: "tuning",
        }),
      ),
    ).toBe(true);
  });

  it("still excludes tuev-category invoices", () => {
    expect(
      isCostOverviewDocument(buildInvoiceDoc({ category: "tuev" })),
    ).toBe(false);
  });
});

describe("filterCostOverviewDocuments", () => {
  it("keeps manual and scanned invoices", () => {
    const docs = filterCostOverviewDocuments([
      buildInvoiceDoc({ id: "scan" }),
      buildInvoiceDoc({
        id: "manual",
        invoice_number: "__manual__",
        file_url: "manual://x",
      }),
    ]);
    expect(docs.map((d) => d.id).sort()).toEqual(["manual", "scan"]);
  });
});

describe("filterInvoiceReceiptDocuments", () => {
  it("keeps invoice scans and manual entries visible in Belege list", () => {
    const visible = filterInvoiceReceiptDocuments([
      buildInvoiceDoc({ id: "a", category: "service" }),
      buildInvoiceDoc({
        id: "m",
        invoice_number: "__manual__",
        file_url: "manual://x",
        category: "tuning",
      }),
      buildInvoiceDoc({ id: "b", type: "abe", category: "abe" }),
      buildInvoiceDoc({ id: "c", category: "tuev", type: "invoice" }),
    ]);

    expect(visible.map((doc) => doc.id).sort()).toEqual(["a", "m"]);
  });
});
