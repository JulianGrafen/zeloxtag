/**
 * Arithmetic verification for LLM-extracted invoice positions.
 *
 * The extraction itself is done entirely by the LLM. This module never re-pairs
 * descriptions with amounts from OCR text — it only checks that the positions
 * add up to the totals printed on the invoice and drops rows that can never be
 * a position (footer sums, column headers, price-only labels).
 */

import { isInvoiceFooterSummaryLabel } from "@/lib/ocr/invoice-footer-totals";
import { isJunkInvoiceLineLabel } from "@/lib/ocr/invoice-line-item-dedupe";
import { isHtmlDebrisLabel } from "@/lib/ocr/normalize-ocr-markdown";
import {
  INVOICE_TOTAL_TOLERANCE_EUR,
  sumBillableLineItemTotals,
} from "@/services/invoice/InvoiceMathValidator";
import type { InvoiceLineItem } from "@/types/invoice";

/** Printed footer values, each null when not readable on the document. */
export type InvoicePrintedTotals = {
  net: number | null;
  vat: number | null;
  gross: number | null;
};

/** Why verification failed — drives the corrective retry and the review hint. */
export type InvoiceVerificationIssue =
  | "no_positions"
  | "no_printed_total"
  | "position_sum_mismatch"
  | "footer_total_mismatch";

export type InvoiceTotalsVerdict = {
  verified: boolean;
  /** Sum of all billable positions (VAT rows excluded), null when empty. */
  positionsSum: number | null;
  /** Printed net the sum was compared against, null when nothing was readable. */
  expectedTotal: number | null;
  /** |positionsSum − expectedTotal| in EUR. */
  delta: number | null;
  issues: InvoiceVerificationIssue[];
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function withinTolerance(delta: number): boolean {
  return delta <= INVOICE_TOTAL_TOLERANCE_EUR;
}

/** Rows that restate a total or a column header are never billable positions. */
export function isNonPositionInvoiceLabel(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed) return true;
  if (isJunkInvoiceLineLabel(trimmed)) return true;
  if (isInvoiceFooterSummaryLabel(trimmed)) return true;
  if (isHtmlDebrisLabel(trimmed)) return true;
  // Labels without a readable word are OCR debris, not a position name.
  return !/[a-zäöüß]{2,}/i.test(trimmed);
}

export function dropNonPositionRows(
  items: InvoiceLineItem[],
): InvoiceLineItem[] {
  return items.filter((item) => !isNonPositionInvoiceLabel(item.description));
}

/** Printed net, or net derived from the other two printed footer values. */
export function resolveExpectedNetTotal(
  totals: InvoicePrintedTotals,
): number | null {
  if (totals.net != null) return roundMoney(totals.net);
  if (totals.gross == null) return null;
  return roundMoney(totals.gross - (totals.vat ?? 0));
}

function positionKey(item: InvoiceLineItem): string {
  return `${item.description.toLowerCase().replace(/\s+/g, " ").trim()}|${roundMoney(
    item.total_price,
  )}`;
}

function dropRepeatedRows(items: InvoiceLineItem[]): InvoiceLineItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = positionKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dropRowsRestatingATotal(
  items: InvoiceLineItem[],
  totals: InvoicePrintedTotals,
): InvoiceLineItem[] {
  const printed = [totals.gross, totals.net].filter(
    (value): value is number => value != null,
  );
  if (printed.length === 0) return items;

  return items.filter(
    (item) =>
      !printed.some((total) => Math.abs(item.total_price - total) <= 0.01),
  );
}

/**
 * Repairs applied ONLY when they bring the position sum back to the printed
 * net — dropping a real position is worse than flagging the scan for review.
 */
export function repairPositionRows(
  items: InvoiceLineItem[],
  totals: InvoicePrintedTotals,
): InvoiceLineItem[] {
  const expected = resolveExpectedNetTotal(totals);
  if (expected == null || items.length < 2) return items;

  const matchesExpected = (candidate: InvoiceLineItem[]): boolean =>
    candidate.length > 0 &&
    withinTolerance(
      Math.abs(roundMoney(sumBillableLineItemTotals(candidate) - expected)),
    );

  if (matchesExpected(items)) return items;

  const withoutTotalRows = dropRowsRestatingATotal(items, totals);
  const candidates = [
    withoutTotalRows,
    dropRepeatedRows(items),
    dropRepeatedRows(withoutTotalRows),
  ];

  for (const candidate of candidates) {
    if (candidate.length === items.length) continue;
    if (matchesExpected(candidate)) return candidate;
  }

  return items;
}

/** Check the extracted positions against the printed footer totals. */
export function verifyInvoiceTotals(
  items: InvoiceLineItem[],
  totals: InvoicePrintedTotals,
): InvoiceTotalsVerdict {
  const issues: InvoiceVerificationIssue[] = [];
  const positionsSum =
    items.length > 0 ? sumBillableLineItemTotals(items) : null;
  const expectedTotal = resolveExpectedNetTotal(totals);

  if (items.length === 0) issues.push("no_positions");
  if (expectedTotal == null) issues.push("no_printed_total");

  const delta =
    positionsSum != null && expectedTotal != null
      ? roundMoney(Math.abs(positionsSum - expectedTotal))
      : null;

  if (delta != null && !withinTolerance(delta)) {
    issues.push("position_sum_mismatch");
  }

  if (totals.net != null && totals.vat != null && totals.gross != null) {
    const footerDelta = roundMoney(
      Math.abs(totals.net + totals.vat - totals.gross),
    );
    if (!withinTolerance(footerDelta)) issues.push("footer_total_mismatch");
  }

  return {
    verified: issues.length === 0,
    positionsSum,
    expectedTotal,
    delta,
    issues,
  };
}

/** German currency rendering for review hints and retry prompts. */
export function formatEurAmount(value: number | null): string {
  if (value == null) return "—";
  return `${value.toFixed(2).replace(".", ",")} €`;
}

/** German review hint when the positions do not match the printed net. */
export function invoicePositionsMismatchHint(
  positionsSum: number | null,
  expectedTotal: number | null,
): string {
  if (positionsSum == null || expectedTotal == null) {
    return "Die Summe der Positionen konnte nicht gegen den Beleg geprüft werden.";
  }
  return `Die Positionen ergeben ${formatEurAmount(positionsSum)}, auf dem Beleg steht ${formatEurAmount(expectedTotal)} — bitte Positionen prüfen.`;
}

/** German review hint for an unverified extraction. */
export function describeInvoiceVerificationIssue(
  verdict: InvoiceTotalsVerdict,
): string | null {
  if (verdict.verified) return null;

  if (verdict.issues.includes("position_sum_mismatch")) {
    return invoicePositionsMismatchHint(
      verdict.positionsSum,
      verdict.expectedTotal,
    );
  }
  if (verdict.issues.includes("no_positions")) {
    return "Es wurden keine Positionen erkannt — bitte manuell ergänzen.";
  }
  if (verdict.issues.includes("footer_total_mismatch")) {
    return "Netto, MwSt. und Endbetrag passen nicht zusammen — bitte Beträge prüfen.";
  }
  return "Die Summe der Positionen konnte nicht gegen den Beleg geprüft werden.";
}
