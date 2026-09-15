import { describe, expect, it } from "vitest";

import {
  INVOICE_DETAIL_EDIT_ANCHORS,
  INVOICE_DETAIL_EDIT_MENU_ORDER,
  MANUAL_ENTRY_DETAIL_EDIT_MENU_ORDER,
  resolveDetailEditMenuOrder,
} from "@/lib/documents/invoice-detail-edit";

describe("invoice-detail-edit", () => {
  it("maps each menu target to a unique anchor id", () => {
    const anchors = Object.values(INVOICE_DETAIL_EDIT_ANCHORS);
    expect(new Set(anchors).size).toBe(anchors.length);
    expect(INVOICE_DETAIL_EDIT_MENU_ORDER).toHaveLength(4);
    expect(MANUAL_ENTRY_DETAIL_EDIT_MENU_ORDER).toHaveLength(7);
    expect(resolveDetailEditMenuOrder(true)).toEqual(
      MANUAL_ENTRY_DETAIL_EDIT_MENU_ORDER,
    );
  });
});
