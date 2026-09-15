export type InvoiceDetailEditTarget =
  | "lineItems"
  | "title"
  | "vendor"
  | "date";

export const INVOICE_DETAIL_EDIT_ANCHORS: Record<
  InvoiceDetailEditTarget,
  string
> = {
  lineItems: "beleg-edit-line-items",
  title: "beleg-edit-title",
  vendor: "beleg-edit-vendor",
  date: "beleg-edit-date",
};

export const INVOICE_DETAIL_EDIT_LABELS: Record<
  InvoiceDetailEditTarget,
  string
> = {
  lineItems: "Rechnungspositionen",
  title: "Titel",
  vendor: "Werkstatt",
  date: "Datum",
};

/** Sheet menu order (user-specified). */
export const INVOICE_DETAIL_EDIT_MENU_ORDER: InvoiceDetailEditTarget[] = [
  "lineItems",
  "title",
  "vendor",
  "date",
];

export function scrollToInvoiceEditTarget(target: InvoiceDetailEditTarget): void {
  const id = INVOICE_DETAIL_EDIT_ANCHORS[target];
  const element = document.getElementById(id);
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block: "center" });
}
