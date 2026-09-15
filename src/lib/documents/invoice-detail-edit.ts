export type InvoiceDetailEditTarget =
  | "lineItems"
  | "title"
  | "vendor"
  | "date"
  | "mileage"
  | "notes"
  | "amount";

export const INVOICE_DETAIL_EDIT_ANCHORS: Record<
  InvoiceDetailEditTarget,
  string
> = {
  lineItems: "beleg-edit-line-items",
  title: "beleg-edit-title",
  vendor: "beleg-edit-vendor",
  date: "beleg-edit-date",
  mileage: "beleg-edit-mileage",
  notes: "beleg-edit-notes",
  amount: "beleg-edit-amount",
};

export const INVOICE_DETAIL_EDIT_LABELS: Record<
  InvoiceDetailEditTarget,
  string
> = {
  lineItems: "Rechnungspositionen",
  title: "Titel",
  vendor: "Werkstatt",
  date: "Datum",
  mileage: "Kilometerstand",
  notes: "Notizen",
  amount: "Gesamtbetrag",
};

const MANUAL_ENTRY_EDIT_LABELS: Partial<
  Record<InvoiceDetailEditTarget, string>
> = {
  lineItems: "Positionen",
  vendor: "Werkstatt / Ausführender",
};

/** Scanned invoice menu (user-specified). */
export const INVOICE_DETAIL_EDIT_MENU_ORDER: InvoiceDetailEditTarget[] = [
  "lineItems",
  "title",
  "vendor",
  "date",
];

export const MANUAL_ENTRY_DETAIL_EDIT_MENU_ORDER: InvoiceDetailEditTarget[] = [
  "lineItems",
  "title",
  "vendor",
  "date",
  "mileage",
  "amount",
  "notes",
];

export function resolveDetailEditMenuOrder(
  isManualEntry: boolean,
): InvoiceDetailEditTarget[] {
  return isManualEntry
    ? MANUAL_ENTRY_DETAIL_EDIT_MENU_ORDER
    : INVOICE_DETAIL_EDIT_MENU_ORDER;
}

export function resolveDetailEditLabel(
  target: InvoiceDetailEditTarget,
  isManualEntry: boolean,
): string {
  if (isManualEntry && MANUAL_ENTRY_EDIT_LABELS[target]) {
    return MANUAL_ENTRY_EDIT_LABELS[target]!;
  }
  return INVOICE_DETAIL_EDIT_LABELS[target];
}

export function scrollToInvoiceEditTarget(target: InvoiceDetailEditTarget): void {
  const id = INVOICE_DETAIL_EDIT_ANCHORS[target];
  const element = document.getElementById(id);
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block: "center" });
}
