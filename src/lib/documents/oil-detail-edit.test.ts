import { describe, expect, it } from "vitest";

import {
  INVOICE_OIL_DETAIL_EDIT_MENU_ORDER,
  MANUAL_OIL_DETAIL_EDIT_MENU_ORDER,
  OIL_DETAIL_EDIT_ANCHORS,
  mapOilEditToDocumentTarget,
  resolveOilDetailEditMenuOrder,
} from "@/lib/documents/oil-detail-edit";

describe("oil-detail-edit", () => {
  it("uses unique anchor ids", () => {
    const anchors = Object.values(OIL_DETAIL_EDIT_ANCHORS);
    expect(new Set(anchors).size).toBe(anchors.length);
  });

  it("resolves menu orders for manual vs invoice oil", () => {
    expect(resolveOilDetailEditMenuOrder(true)).toEqual(
      MANUAL_OIL_DETAIL_EDIT_MENU_ORDER,
    );
    expect(resolveOilDetailEditMenuOrder(false)).toEqual(
      INVOICE_OIL_DETAIL_EDIT_MENU_ORDER,
    );
  });

  it("maps shared document edit targets", () => {
    expect(mapOilEditToDocumentTarget("date")).toBe("date");
    expect(mapOilEditToDocumentTarget("oilSpec")).toBeNull();
    expect(mapOilEditToDocumentTarget("openInvoice")).toBeNull();
  });
});
