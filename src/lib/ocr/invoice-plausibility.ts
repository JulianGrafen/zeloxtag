import { sumLineItems } from "@/lib/documents/line-items";
import { realignShiftedInvoiceLineItems } from "@/lib/ocr/invoice-line-item-alignment";
import {
  extractGrossTotalFromText,
  extractNetSumFromText,
  isInvoiceFooterSummaryLabel,
  stripNonPositionInvoiceRows,
} from "@/lib/ocr/invoice-footer-totals";
import {
  extractInvoiceLineItemsFromText,
  preferInvoiceLineItems,
  reconcileLineItemAmountsWithOcrText,
} from "@/lib/ocr/invoice-line-items-from-text";
import {
  extractVatAmountFromText,
  grossAmountLooksPlausible,
  isPlausibleInvoiceVatAmount,
  isVatLineItem,
} from "@/lib/ocr/invoice-vat";
import type { InvoiceLineItem } from "@/lib/ocr/text-parse-schema";

/** Max deviation between position net sum and footer Nettosumme. */
export const NET_SUM_TOLERANCE_EUR = 1.5;
/** Max deviation for brutto / MwSt arithmetic. */
export const GROSS_TOTAL_TOLERANCE_EUR = 0.05;

export type InvoicePlausibilityIssue =
  | "positions_net_mismatch"
  | "gross_total_mismatch"
  | "vat_math_mismatch"
  | "implausible_vat_line"
  | "footer_row_as_position";

export type InvoicePlausibilitySnapshot = {
  positionNetSum: number | null;
  vatSum: number | null;
  footerNet: number | null;
  footerGross: number | null;
  footerVat: number | null;
  resolvedGross: number | null;
  netDelta: number | null;
  grossDelta: number | null;
};

export type InvoicePlausibilityCheck = {
  plausible: boolean;
  issues: InvoicePlausibilityIssue[];
  snapshot: InvoicePlausibilitySnapshot;
};

export type ReconcileInvoicePlausibilityOptions = {
  lineItems: InvoiceLineItem[] | null | undefined;
  amount: number | null | undefined;
  ocrText?: string;
  ocrHeuristicItems?: InvoiceLineItem[] | null;
  enableRealign?: boolean;
  enableOcrReconcile?: boolean;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function splitPositionsAndVat(items: InvoiceLineItem[]): {
  positions: InvoiceLineItem[];
  vatItems: InvoiceLineItem[];
} {
  const positions: InvoiceLineItem[] = [];
  const vatItems: InvoiceLineItem[] = [];
  for (const item of items) {
    if (isVatLineItem(item)) vatItems.push(item);
    else positions.push(item);
  }
  return { positions, vatItems };
}

function positionsMatchFooterNet(
  positionNetSum: number | null,
  footerNet: number | null,
): boolean {
  if (positionNetSum == null || footerNet == null) return false;
  return Math.abs(positionNetSum - footerNet) <= NET_SUM_TOLERANCE_EUR;
}

function buildSnapshot(options: {
  lineItems: InvoiceLineItem[];
  amount: number | null;
  ocrText: string;
}): InvoicePlausibilitySnapshot {
  const { lineItems, amount, ocrText } = options;
  const { positions, vatItems } = splitPositionsAndVat(lineItems);
  const positionNetSum = sumLineItems(positions);
  const vatSum =
    vatItems.length > 0
      ? roundMoney(vatItems.reduce((sum, item) => sum + item.amount, 0))
      : null;
  const footerNet = ocrText ? extractNetSumFromText(ocrText) : null;
  const footerGross = ocrText ? extractGrossTotalFromText(ocrText) : null;
  const footerVat = ocrText ? extractVatAmountFromText(ocrText) : null;
  const resolvedGross = amount ?? footerGross;

  return {
    positionNetSum,
    vatSum,
    footerNet,
    footerGross,
    footerVat,
    resolvedGross,
    netDelta:
      footerNet != null && positionNetSum != null
        ? roundMoney(Math.abs(positionNetSum - footerNet))
        : null,
    grossDelta:
      footerGross != null && resolvedGross != null
        ? roundMoney(Math.abs(resolvedGross - footerGross))
        : null,
  };
}

/**
 * Cross-check position net sums, footer totals, and MwSt arithmetic.
 * Read-only — use {@link reconcileInvoicePlausibility} to auto-correct.
 */
export function checkInvoicePlausibility(options: {
  lineItems: InvoiceLineItem[] | null | undefined;
  amount: number | null | undefined;
  ocrText?: string;
}): InvoicePlausibilityCheck {
  const { lineItems, amount, ocrText = "" } = options;
  const issues: InvoicePlausibilityIssue[] = [];

  if (lineItems?.some((item) => isInvoiceFooterSummaryLabel(item.label))) {
    issues.push("footer_row_as_position");
  }

  const cleaned = stripNonPositionInvoiceRows(lineItems ?? null) ?? [];
  const snapshot = buildSnapshot({
    lineItems: cleaned,
    amount: amount ?? null,
    ocrText,
  });
  const { vatItems } = splitPositionsAndVat(cleaned);

  const originalVatItems =
    lineItems?.filter((item) => isVatLineItem(item)) ?? [];
  const positionNetForVat =
    sumLineItems(
      (lineItems ?? []).filter(
        (item) =>
          !isVatLineItem(item) && !isInvoiceFooterSummaryLabel(item.label),
      ),
    ) ?? snapshot.positionNetSum;

  for (const item of originalVatItems) {
    if (
      positionNetForVat != null &&
      !isPlausibleInvoiceVatAmount(item.amount, positionNetForVat)
    ) {
      issues.push("implausible_vat_line");
      break;
    }
  }

  if (
    snapshot.footerNet != null &&
    snapshot.positionNetSum != null &&
    !positionsMatchFooterNet(snapshot.positionNetSum, snapshot.footerNet)
  ) {
    issues.push("positions_net_mismatch");
  }

  for (const item of vatItems) {
    if (
      snapshot.positionNetSum != null &&
      !isPlausibleInvoiceVatAmount(item.amount, snapshot.positionNetSum)
    ) {
      if (!issues.includes("implausible_vat_line")) {
        issues.push("implausible_vat_line");
      }
      break;
    }
  }

  if (
    snapshot.footerGross != null &&
    snapshot.resolvedGross != null &&
    snapshot.grossDelta != null &&
    snapshot.grossDelta > GROSS_TOTAL_TOLERANCE_EUR
  ) {
    issues.push("gross_total_mismatch");
  }

  if (
    snapshot.footerNet != null &&
    snapshot.positionNetSum != null &&
    positionsMatchFooterNet(snapshot.positionNetSum, snapshot.footerNet) &&
    snapshot.resolvedGross != null
  ) {
    const vatForMath =
      snapshot.footerVat ??
      snapshot.vatSum ??
      (snapshot.resolvedGross > snapshot.footerNet
        ? roundMoney(snapshot.resolvedGross - snapshot.footerNet)
        : null);

    if (vatForMath != null) {
      const expectedGross = roundMoney(snapshot.footerNet + vatForMath);
      if (
        Math.abs(expectedGross - snapshot.resolvedGross) >
          GROSS_TOTAL_TOLERANCE_EUR &&
        !grossAmountLooksPlausible(snapshot.footerNet, snapshot.resolvedGross)
      ) {
        issues.push("vat_math_mismatch");
      }
    }
  }

  return {
    plausible: issues.length === 0,
    issues,
    snapshot,
  };
}

function resolveHeuristicItems(
  ocrText: string,
  provided: InvoiceLineItem[] | null | undefined,
): InvoiceLineItem[] | null {
  if (provided?.length) {
    return stripNonPositionInvoiceRows(provided);
  }
  if (!ocrText.trim()) return null;
  return stripNonPositionInvoiceRows(extractInvoiceLineItemsFromText(ocrText));
}

function pickBestPositionSet(options: {
  current: InvoiceLineItem[] | null;
  ocrHeuristic: InvoiceLineItem[] | null;
  footerNet: number | null;
  ocrText: string;
  enableOcrReconcile: boolean;
  enableRealign: boolean;
}): InvoiceLineItem[] | null {
  const {
    current,
    ocrHeuristic,
    footerNet,
    ocrText,
    enableOcrReconcile,
    enableRealign,
  } = options;

  let working = stripNonPositionInvoiceRows(current) ?? null;
  if (ocrHeuristic?.length) {
    working = preferInvoiceLineItems(working, ocrHeuristic);
  }

  if (footerNet != null && ocrHeuristic?.length) {
    const currentSum = sumLineItems(working);
    const ocrSum = sumLineItems(ocrHeuristic);
    if (
      (!positionsMatchFooterNet(currentSum, footerNet) ||
        (working?.length ?? 0) < ocrHeuristic.length) &&
      positionsMatchFooterNet(ocrSum, footerNet)
    ) {
      working = ocrHeuristic;
    }
  }

  if (enableOcrReconcile && ocrText.trim()) {
    working = reconcileLineItemAmountsWithOcrText(working, ocrText);
  }

  const realignTarget = footerNet ?? sumLineItems(working);
  if (enableRealign && footerNet != null) {
    working = realignShiftedInvoiceLineItems(
      stripNonPositionInvoiceRows(working),
      realignTarget,
    );
  }

  return stripNonPositionInvoiceRows(working);
}

function resolveGrossAmount(options: {
  amount: number | null;
  footerGross: number | null;
  footerNet: number | null;
  positionNetSum: number | null;
}): number | null {
  const { amount, footerGross, footerNet, positionNetSum } = options;

  if (footerGross != null) {
    if (amount == null) return footerGross;
    if (Math.abs(amount - footerGross) <= GROSS_TOTAL_TOLERANCE_EUR) {
      return footerGross;
    }
    if (
      footerNet != null &&
      positionNetSum != null &&
      positionsMatchFooterNet(positionNetSum, footerNet) &&
      grossAmountLooksPlausible(footerNet, footerGross) &&
      amount < footerGross - GROSS_TOTAL_TOLERANCE_EUR
    ) {
      return footerGross;
    }
    if (
      footerNet != null &&
      Math.abs(amount - footerNet) <= GROSS_TOTAL_TOLERANCE_EUR &&
      grossAmountLooksPlausible(footerNet, footerGross)
    ) {
      return footerGross;
    }
  }

  return amount;
}

/**
 * Validate invoice positions against footer totals and apply OCR-based corrections
 * when the checksum fails (net sum, brutto, MwSt).
 */
export function reconcileInvoicePlausibility(
  options: ReconcileInvoicePlausibilityOptions,
): {
  lineItems: InvoiceLineItem[] | null;
  amount: number | null;
  check: InvoicePlausibilityCheck;
} {
  const {
    lineItems,
    amount,
    ocrText = "",
    ocrHeuristicItems,
    enableRealign = true,
    enableOcrReconcile = true,
  } = options;

  const footerNet = ocrText ? extractNetSumFromText(ocrText) : null;
  const footerGross = ocrText ? extractGrossTotalFromText(ocrText) : null;
  const ocrHeuristic = resolveHeuristicItems(ocrText, ocrHeuristicItems);

  let resolvedItems = pickBestPositionSet({
    current: lineItems ?? null,
    ocrHeuristic,
    footerNet,
    ocrText,
    enableOcrReconcile,
    enableRealign,
  });

  if (!resolvedItems?.length && ocrHeuristic?.length) {
    resolvedItems = ocrHeuristic;
  }

  const positionNetSum = sumLineItems(
    splitPositionsAndVat(resolvedItems ?? []).positions,
  );
  const resolvedAmount = resolveGrossAmount({
    amount: amount ?? null,
    footerGross,
    footerNet,
    positionNetSum,
  });

  const check = checkInvoicePlausibility({
    lineItems: resolvedItems,
    amount: resolvedAmount,
    ocrText,
  });

  return {
    lineItems: resolvedItems,
    amount: resolvedAmount,
    check,
  };
}
