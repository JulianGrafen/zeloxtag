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

export interface ParsedInvoice {
  vendor_name: string | null;
  invoice_number: string | null;
  /** ISO date YYYY-MM-DD */
  invoice_date: string | null;
  vehicle: InvoiceVehicleData;
  totals: InvoiceTotals;
  line_items: InvoiceLineItem[];
}

/** Raw LLM payload before math validation (no is_math_valid yet). */
export type InvoiceLineItemDraft = Omit<InvoiceLineItem, "is_math_valid">;

export type ParsedInvoiceDraft = Omit<ParsedInvoice, "line_items"> & {
  line_items: InvoiceLineItemDraft[];
};
