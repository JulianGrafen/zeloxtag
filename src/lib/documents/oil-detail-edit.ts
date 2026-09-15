import type { InvoiceDetailEditTarget } from "@/lib/documents/invoice-detail-edit";

export type OilDetailEditTarget =
  | "date"
  | "mileage"
  | "vendor"
  | "oilSpec"
  | "oilLiters"
  | "filter"
  | "notes"
  | "openInvoice";

export const OIL_DETAIL_EDIT_ANCHORS: Record<OilDetailEditTarget, string> = {
  date: "oil-edit-date",
  mileage: "oil-edit-mileage",
  vendor: "oil-edit-vendor",
  oilSpec: "oil-edit-oil-spec",
  oilLiters: "oil-edit-oil-liters",
  filter: "oil-edit-filter",
  notes: "oil-edit-notes",
  openInvoice: "oil-edit-open-invoice",
};

export const OIL_DETAIL_EDIT_LABELS: Record<OilDetailEditTarget, string> = {
  date: "Datum",
  mileage: "Kilometerstand",
  vendor: "Werkstatt / Durchführung",
  oilSpec: "Ölsorte",
  oilLiters: "Ölmenge",
  filter: "Ölfilter",
  notes: "Notizen",
  openInvoice: "Beleg in Akte bearbeiten",
};

export const MANUAL_OIL_DETAIL_EDIT_MENU_ORDER: OilDetailEditTarget[] = [
  "date",
  "mileage",
  "vendor",
  "oilSpec",
  "oilLiters",
  "filter",
  "notes",
];

export const INVOICE_OIL_DETAIL_EDIT_MENU_ORDER: OilDetailEditTarget[] = [
  "date",
  "mileage",
  "vendor",
  "notes",
  "openInvoice",
];

export function resolveOilDetailEditMenuOrder(
  isManualOilLog: boolean,
): OilDetailEditTarget[] {
  return isManualOilLog
    ? MANUAL_OIL_DETAIL_EDIT_MENU_ORDER
    : INVOICE_OIL_DETAIL_EDIT_MENU_ORDER;
}

export function mapOilEditToDocumentTarget(
  target: OilDetailEditTarget | null,
): InvoiceDetailEditTarget | null {
  if (!target || target === "openInvoice") return null;
  if (target === "oilSpec" || target === "oilLiters" || target === "filter") {
    return null;
  }
  return target;
}

export function scrollToOilEditTarget(target: OilDetailEditTarget): void {
  if (target === "openInvoice") return;
  const id = OIL_DETAIL_EDIT_ANCHORS[target];
  const element = document.getElementById(id);
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block: "center" });
}
