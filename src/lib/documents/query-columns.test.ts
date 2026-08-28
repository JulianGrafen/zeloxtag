import { describe, expect, it } from "vitest";

import {
  DOCUMENT_ABE_LIST_COLUMNS,
  DOCUMENT_INVOICE_LIST_COLUMNS,
  DOCUMENT_LIST_COLUMNS,
  DOCUMENT_SHOWCASE_COLUMNS,
} from "@/lib/documents/query-columns";

function columnSet(csv: string): Set<string> {
  return new Set(csv.split(",").map((col) => col.trim()));
}

describe("document list column projections", () => {
  it("ABE list omits line_items but keeps list/search fields", () => {
    const cols = columnSet(DOCUMENT_ABE_LIST_COLUMNS);
    expect(cols.has("line_items")).toBe(false);
    expect(cols.has("kba_number")).toBe(true);
    expect(cols.has("approval_fields")).toBe(true);
    expect(cols.has("vehicle_approvals")).toBe(true);
    expect(cols.has("authority")).toBe(true);
    expect(cols.has("part_category")).toBe(true);
  });

  it("showcase projection includes manual-entry and showcase flags", () => {
    const cols = columnSet(DOCUMENT_SHOWCASE_COLUMNS);
    expect(cols.has("invoice_number")).toBe(true);
    expect(cols.has("show_on_public_showcase")).toBe(true);
    expect(cols.has("kba_number")).toBe(false);
    expect(cols.has("approval_fields")).toBe(false);
  });

  it("invoice list is slimmer than full list for ABE-heavy columns", () => {
    const invoiceCols = columnSet(DOCUMENT_INVOICE_LIST_COLUMNS);
    const listCols = columnSet(DOCUMENT_LIST_COLUMNS);
    expect(invoiceCols.has("kba_number")).toBe(false);
    expect(listCols.has("kba_number")).toBe(true);
  });
});
