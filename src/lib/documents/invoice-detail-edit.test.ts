import { describe, expect, it } from "vitest";

import {
  INVOICE_DETAIL_EDIT_ANCHORS,
  INVOICE_DETAIL_EDIT_MENU_ORDER,
} from "@/lib/documents/invoice-detail-edit";

describe("invoice-detail-edit", () => {
  it("maps each menu target to a unique anchor id", () => {
    const anchors = INVOICE_DETAIL_EDIT_MENU_ORDER.map(
      (target) => INVOICE_DETAIL_EDIT_ANCHORS[target],
    );
    expect(new Set(anchors).size).toBe(anchors.length);
    expect(INVOICE_DETAIL_EDIT_MENU_ORDER).toHaveLength(4);
  });
});
