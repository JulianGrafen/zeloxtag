/**
 * Resolve invoice line totals from Menge × E-Preis with Ges. Preis validation.
 * Output is always the Gesamtpreis / Zeilensumme — never Einzelpreis alone when qty > 1.
 */

export type InvoiceRowPriceParts = {
  quantity: number | null;
  unitPrice: number | null;
  statedTotal: number | null;
};

const QTY_HEADER =
  /(?:^|\b)(?:menge|anz\.?|anzahl|stk\.?|stück|stck|einheit|qty|me)(?:\b|$)/i;

const UNIT_PRICE_HEADER =
  /(?:^|\b)(?:e-?preis|einzelpreis|ep|stückpreis|stk\.?\s*preis|netto(?:preis)?|listenpreis|vk)(?:\b|$)/i;

const TOTAL_PRICE_HEADER =
  /(?:^|\b)(?:ges\.?\s*preis|gesamtpreis|ges\.?\s*summe|gesamtbetrag|g-?preis|summe|betrag|wert|total|gp|brutto|eur)(?:\b|$)/i;

export function roundInvoiceMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Parse Menge / Einheit from a table cell (integer or simple decimal). */
export function parseInvoiceQuantityCell(value: string): number | null {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed || /%/.test(trimmed)) return null;
  if (/,\d{2}$/.test(trimmed) || /\.\d{2}$/.test(trimmed)) return null;

  if (/^\d+$/.test(trimmed)) {
    const qty = Number.parseInt(trimmed, 10);
    if (Number.isFinite(qty) && qty >= 1 && qty <= 10_000) return qty;
    return null;
  }

  if (/^\d+[.,]\d+$/.test(trimmed)) {
    const qty = Number.parseFloat(trimmed.replace(",", "."));
    if (!Number.isFinite(qty) || qty <= 0 || qty > 10_000) return null;
    if (Math.abs(qty - Math.round(qty)) > 0.001) return qty;
    return Math.round(qty);
  }

  return null;
}

export function amountsMatchQtyTimesUnit(
  quantity: number,
  unitPrice: number,
  candidateTotal: number,
  tolerance = 0.05,
): boolean {
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice) || !Number.isFinite(candidateTotal)) {
    return false;
  }
  return Math.abs(roundInvoiceMoney(quantity * unitPrice) - candidateTotal) <= tolerance;
}

/**
 * Gesamtpreis aus Menge × E-Preis; Ges.-Spalte als Prüfsumme.
 * Ohne Menge: Ges. Preis bevorzugen, sonst E-Preis.
 */
export function resolveInvoiceLineTotalAmount(
  parts: InvoiceRowPriceParts,
): number | null {
  const quantity =
    parts.quantity != null && parts.quantity > 0 ? parts.quantity : null;
  const unitPrice =
    parts.unitPrice != null && Number.isFinite(parts.unitPrice)
      ? roundInvoiceMoney(parts.unitPrice)
      : null;
  const statedTotal =
    parts.statedTotal != null && Number.isFinite(parts.statedTotal)
      ? roundInvoiceMoney(parts.statedTotal)
      : null;

  if (quantity != null && unitPrice != null) {
    const computed = roundInvoiceMoney(quantity * unitPrice);

    if (statedTotal == null) {
      return computed;
    }

    if (amountsMatchQtyTimesUnit(quantity, unitPrice, statedTotal)) {
      return statedTotal;
    }

    // OCR/LLM lieferte E-Preis statt Ges. Preis — Menge × EP ist maßgeblich.
    if (quantity > 1 && Math.abs(statedTotal - unitPrice) < 0.02) {
      return computed;
    }

    if (statedTotal + 0.01 < computed) {
      return computed;
    }

    return statedTotal;
  }

  if (statedTotal != null && unitPrice != null) {
    if (statedTotal >= unitPrice - 0.01) {
      return statedTotal;
    }
    return unitPrice;
  }

  if (statedTotal != null) return statedTotal;
  if (unitPrice != null) return unitPrice;
  return null;
}

export function detectQuantityColumnIndex(
  headerCells: Array<{ columnIndex: number; content: string }>,
  labelColumnIndex: number,
  unitColumnIndex: number | null,
  totalColumnIndex: number | null,
  columnCount: number,
): number | null {
  for (const cell of headerCells) {
    if (QTY_HEADER.test(cell.content.trim())) {
      return cell.columnIndex;
    }
  }

  const searchStart = labelColumnIndex + 1;
  const searchEnd =
    unitColumnIndex != null
      ? unitColumnIndex
      : totalColumnIndex != null
        ? totalColumnIndex
        : columnCount;

  for (let columnIndex = searchStart; columnIndex < searchEnd; columnIndex += 1) {
    const header = headerCells.find((cell) => cell.columnIndex === columnIndex);
    const label = header?.content.trim().toLowerCase() ?? "";
    if (!label || QTY_HEADER.test(label)) return columnIndex;
    if (UNIT_PRICE_HEADER.test(label) || TOTAL_PRICE_HEADER.test(label)) break;
  }

  if (searchEnd - searchStart === 1) {
    return searchStart;
  }

  return null;
}

export function detectUnitPriceColumnIndex(
  headerCells: Array<{ columnIndex: number; content: string }>,
): number | null {
  for (const cell of headerCells) {
    if (UNIT_PRICE_HEADER.test(cell.content.trim())) {
      return cell.columnIndex;
    }
  }
  return null;
}

export function detectLineTotalColumnIndex(
  headerCells: Array<{ columnIndex: number; content: string }>,
  columnCount: number,
): number | null {
  let bestIndex: number | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    const header = headerCells.find((cell) => cell.columnIndex === columnIndex);
    const label = header?.content.trim().toLowerCase() ?? "";
    let score = columnIndex * 2;

    if (TOTAL_PRICE_HEADER.test(label)) score += 40;
    if (UNIT_PRICE_HEADER.test(label)) score -= 50;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = columnIndex;
    }
  }

  return bestScore >= 0 ? bestIndex : null;
}

export function readQuantityFromRowCells(
  rowCells: Array<{ columnIndex: number; content: string }>,
  quantityColumnIndex: number | null,
  labelColumnIndex: number,
  unitColumnIndex: number | null,
  totalColumnIndex: number | null,
): number | null {
  if (quantityColumnIndex != null) {
    const cell = rowCells.find((entry) => entry.columnIndex === quantityColumnIndex);
    const parsed = parseInvoiceQuantityCell(cell?.content ?? "");
    if (parsed != null) return parsed;
  }

  const searchStart = labelColumnIndex + 1;
  const searchEnd =
    unitColumnIndex ??
    totalColumnIndex ??
    Math.max(...rowCells.map((cell) => cell.columnIndex), searchStart);

  let bestQty: number | null = null;
  for (const cell of rowCells) {
    if (cell.columnIndex < searchStart || cell.columnIndex >= searchEnd) continue;
    const parsed = parseInvoiceQuantityCell(cell.content);
    if (parsed == null) continue;
    if (bestQty == null || cell.columnIndex < (quantityColumnIndex ?? cell.columnIndex)) {
      bestQty = parsed;
    }
  }

  return bestQty;
}
