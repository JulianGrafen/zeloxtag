export const DEFAULT_VAT_RATE = 0.19;

/** Max cent drift between OCR line sum and invoice total that still counts as a match. */
export const INVOICE_TOTAL_TOLERANCE_EUR = 0.05;

export type InvoiceTotals =
  | {
      kind: "net-lines";
      net: number;
      vat: number;
      gross: number;
      vatRate: number;
    }
  | {
      kind: "gross-lines";
      net: number;
      vat: number;
      gross: number;
      vatRate: number;
    }
  | { kind: "unreconciled"; lineSum: number; gross: number }
  | { kind: "total-only"; gross: number }
  | { kind: "lines-only"; lineSum: number };

export type ResolveInvoiceTotalsInput = {
  total: number | null | undefined;
  lineAmounts: readonly number[];
  vatRate?: number;
};

const CENTS = 100;

function toCents(value: number): number {
  return Math.round(value * CENTS);
}

function fromCents(cents: number): number {
  return cents / CENTS;
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value);
}

/**
 * Derive Netto / MwSt. / Brutto from the stored gross total and OCR line items.
 * Lines that sum to the total are treated as gross; lines that sum to total / (1 + rate) as net.
 */
export function resolveInvoiceTotals({
  total,
  lineAmounts,
  vatRate = DEFAULT_VAT_RATE,
}: ResolveInvoiceTotalsInput): InvoiceTotals | null {
  const validLines = lineAmounts.filter((amount) => Number.isFinite(amount));
  const hasTotal = isFiniteNumber(total);
  const lineSumCents = validLines.reduce((sum, amount) => sum + toCents(amount), 0);

  if (!hasTotal) {
    return validLines.length > 0
      ? { kind: "lines-only", lineSum: fromCents(lineSumCents) }
      : null;
  }

  const grossCents = toCents(total);
  if (validLines.length === 0) {
    return { kind: "total-only", gross: fromCents(grossCents) };
  }

  const toleranceCents = toCents(INVOICE_TOTAL_TOLERANCE_EUR);

  if (Math.abs(lineSumCents - grossCents) <= toleranceCents) {
    const netCents = Math.round(grossCents / (1 + vatRate));
    return {
      kind: "gross-lines",
      net: fromCents(netCents),
      vat: fromCents(grossCents - netCents),
      gross: fromCents(grossCents),
      vatRate,
    };
  }

  const grossFromNetCents = Math.round(lineSumCents * (1 + vatRate));
  if (Math.abs(grossFromNetCents - grossCents) <= toleranceCents) {
    return {
      kind: "net-lines",
      net: fromCents(lineSumCents),
      vat: fromCents(grossCents - lineSumCents),
      gross: fromCents(grossCents),
      vatRate,
    };
  }

  return {
    kind: "unreconciled",
    lineSum: fromCents(lineSumCents),
    gross: fromCents(grossCents),
  };
}

/** "19 %" for display next to the MwSt. row. */
export function formatVatRateLabel(vatRate: number): string {
  return `${Math.round(vatRate * 100)} %`;
}
