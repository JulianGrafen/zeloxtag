import { isManualVehicleEntry } from "@/lib/documents/manual-entries";
import type { Document } from "@/types/database";

const PAID_MARKERS =
  /(?:bezahlt|ausgeglichen|betrag\s+erhalten|voll(?:ständig)?\s+beglichen|zahlung\s+erhalten|zahlungsziel\s+0|\bpaid\b)/i;

const OPEN_MARKERS =
  /(?:\boffen\b|unbezahlt|zahlbar|fällig|mahnung|zahlungsziel|noch\s+zu\s+zahlen)/i;

export type InvoicePaymentBadge = "bezahlt" | "offen" | "dokumentiert" | null;

/** Payment badge for invoice rows — never assume paid without document evidence. */
export function resolveInvoicePaymentBadge(
  document: Document,
): InvoicePaymentBadge {
  if (isManualVehicleEntry(document)) return "dokumentiert";

  const blob = [document.notes, document.title, document.invoice_number]
    .filter(Boolean)
    .join("\n");

  if (PAID_MARKERS.test(blob)) return "bezahlt";
  if (OPEN_MARKERS.test(blob)) return "offen";
  return null;
}
