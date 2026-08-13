/**
 * Strict domain contracts for the hybrid invoice extraction pipeline.
 * Markdown OCR → LLM JSON → post-processing validation.
 */

export interface InvoiceVehicleData {
  /** Fahrgestellnummer (FIN) */
  vin: string | null;
  /** HSN/TSN (z. B. 0005/ABC) */
  hsn_tsn: string | null;
  /** Amtliches Kennzeichen */
  license_plate: string | null;
  /** Kilometerstand (km) */
  mileage: number | null;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number | null;
  total_price: number;
  /** Set by {@link validateAndFixLineItems} after extraction */
  is_math_valid: boolean;
}

export interface InvoiceTotals {
  /** Nettosumme */
  net_amount: number | null;
  /** MwSt-Betrag */
  vat_amount: number | null;
  /** Brutto / Gesamtbetrag / Endbetrag */
  gross_amount: number;
}

/** Total-Rechnung: Summe aller Positionen vs. Netto/Brutto/MwSt. */
export interface InvoiceTotalReconciliation {
  /** Summe aller fakturierbaren Positionen (ohne MwSt-Zeilen). */
  line_items_net_sum: number;
  line_items_count: number;
  /** |Summe Positionen − Nettosumme| (null wenn Netto unbekannt). */
  net_delta: number | null;
  /** |Summe Positionen + MwSt − Brutto| (null wenn unvollständig). */
  gross_delta: number | null;
  /** |Netto + MwSt − Brutto| aus Footer-Werten. */
  vat_delta: number | null;
  net_reconciled: boolean;
  gross_reconciled: boolean;
  vat_reconciled: boolean;
}

export interface ParsedInvoice {
  vendor_name: string | null;
  invoice_number: string | null;
  /** ISO date YYYY-MM-DD */
  invoice_date: string | null;
  vehicle: InvoiceVehicleData;
  totals: InvoiceTotals;
  line_items: InvoiceLineItem[];
  reconciliation: InvoiceTotalReconciliation;
}

/** Raw LLM payload before math validation (no is_math_valid yet). */
export type InvoiceLineItemDraft = Omit<InvoiceLineItem, "is_math_valid">;

export type ParsedInvoiceDraft = Omit<
  ParsedInvoice,
  "line_items" | "reconciliation"
> & {
  line_items: InvoiceLineItemDraft[];
};
