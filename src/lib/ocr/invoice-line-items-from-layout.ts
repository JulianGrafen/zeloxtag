/**
 * Invoice line items from Azure Document Intelligence layout tables.
 * Pairs label + Gesamtpreis per rowIndex (geometry-aware via table cells).
 */

import {
  isUnitPriceAmountOfTotal,
  normalizedInvoiceLineLabelKey,
} from "@/lib/ocr/invoice-line-item-dedupe";
import {
  isContinuationInvoiceLabel,
  isLikelyInvoiceTableHeaderRow,
  mergeContinuationInvoiceLineItems,
} from "@/lib/ocr/invoice-line-item-alignment";
import {
  extractInvoiceLineItemsFromText,
  lineTotalFromInvoiceRow,
} from "@/lib/ocr/invoice-line-items-from-text";
import { detectInvoiceTableFormat } from "@/lib/ocr/invoice-format-routing";
import {
  extractNetSumFromText,
  invoiceLineItemsMatchNetTotal,
  INVOICE_NET_TOTAL_TOLERANCE_EUR,
  sumInvoiceLineItems,
} from "@/lib/ocr/invoice-footer-totals";
import { extractWorkshopSectionLineItems } from "@/lib/ocr/invoice-workshop-sections";
import { parseGermanMoneyAmount } from "@/lib/ocr/parse-german-money";
import type { InvoiceLineItem } from "@/lib/ocr/text-parse-schema";
import {
  parseGermanNumber,
  resolveInvoiceRowGesamtpreis,
} from "@/utils/invoiceMath";

import type {
  AzureLayoutAnalyzeResult,
  AzureLayoutTable,
  AzureLayoutTableCell,
} from "./azure-document-intelligence";

const MAX_ITEMS = 60;
const NET_TOTAL_TOLERANCE_EUR = INVOICE_NET_TOTAL_TOLERANCE_EUR;

const UNIT_PRICE_HEADER =
  /(?:^|\b)(?:e-?preis|einzelpreis|ep|stückpreis|stk\.?\s*preis|netto(?:preis)?|listenpreis)(?:\b|$)/i;

const TOTAL_PRICE_HEADER =
  /(?:^|\b)(?:ges\.?\s*preis|gesamtpreis|ges\.?\s*summe|gesamtbetrag|g-?preis|summe|betrag|wert|total|gp|brutto|eur)(?:\b|$)/i;

const SKIP_ROW_LABEL =
  /^(?:summe|gesamt(?:betrag)?|zwischensumme|netto(?:betrag)?|brutto(?:betrag)?|rechnungsbetrag|zahlbetrag|position(?:en)?)$/i;

function shouldSkipTableRow(label: string): boolean {
  if (SKIP_ROW_LABEL.test(label)) return true;
  // Rate-only cells like "MwSt 19%" without a € amount — not a billable row.
  if (/^(?:mwst|ust)\.?\s*(?:19|7)?\s*%?\s*$/i.test(label.trim())) return true;
  return false;
}

function cleanCellText(value: string): string {
  return value.replace(/\|/g, " ").replace(/\s+/g, " ").trim();
}

function parseMoneyCell(value: string): number | null {
  const trimmed = cleanCellText(value);
  if (!trimmed || /%/.test(trimmed)) return null;
  // Fractional labor qty like "0,90" without € is Menge, not a price.
  if (!/[€$]/.test(trimmed) && /^0[.,]\d{1,2}$/.test(trimmed)) return null;
  if (!/,\d{2}/.test(trimmed) && !/\.\d{2}/.test(trimmed)) return null;
  return parseGermanMoneyAmount(trimmed);
}

function detectAmountColumnIndex(
  headerCells: Array<{ columnIndex: number; content: string }>,
  columnCount: number,
): number {
  let bestIndex = columnCount - 1;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    const header = headerCells.find((cell) => cell.columnIndex === columnIndex);
    const label = cleanCellText(header?.content ?? "").toLowerCase();
    let score = columnIndex * 2;

    if (TOTAL_PRICE_HEADER.test(label)) score += 40;
    if (UNIT_PRICE_HEADER.test(label)) score -= 50;
    if (/^pos\.?$|^nr\.?$|^menge$|^anz|^stk/.test(label)) score -= 8;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = columnIndex;
    }
  }

  return bestIndex;
}

function detectLabelColumnIndex(
  headerCells: Array<{ columnIndex: number; content: string }>,
  amountColumnIndex: number,
): number {
  for (const cell of headerCells) {
    const label = cleanCellText(cell.content).toLowerCase();
    if (/bezeichnung|beschreibung|artikel|leistung|position/.test(label)) {
      return cell.columnIndex;
    }
  }

  if (amountColumnIndex > 1) return 1;
  return 0;
}

const POS_HEADER = /^pos\.?$/i;
const MENGE_HEADER =
  /(?:^|\b)(?:menge|anz\.?|anzahl|qty|me)(?:\b|$)/i;
const NUMMER_HEADER =
  /(?:^|\b)(?:nummer|nr\.?|art\.?-?nr|artikelnummer)(?:\b|$)/i;
const RABATT_HEADER =
  /(?:^|\b)(?:rab\.?|rabatt|nachlass|discount)(?:\b|$)|^%+$/i;

export type InvoiceTableColumnLayout = {
  posColumnIndex: number | null;
  mengeColumnIndex: number | null;
  nummerColumnIndex: number | null;
  rabattColumnIndex?: number | null;
};

const EMPTY_COLUMN_LAYOUT: InvoiceTableColumnLayout = {
  posColumnIndex: null,
  mengeColumnIndex: null,
  nummerColumnIndex: null,
  rabattColumnIndex: null,
};

function detectPosColumnIndex(
  headerCells: Array<{ columnIndex: number; content: string }>,
): number | null {
  for (const cell of headerCells) {
    if (POS_HEADER.test(cleanCellText(cell.content))) {
      return cell.columnIndex;
    }
  }
  return null;
}

function detectMengeColumnIndex(
  headerCells: Array<{ columnIndex: number; content: string }>,
): number | null {
  for (const cell of headerCells) {
    if (MENGE_HEADER.test(cleanCellText(cell.content))) {
      return cell.columnIndex;
    }
  }
  return null;
}

function detectNummerColumnIndex(
  headerCells: Array<{ columnIndex: number; content: string }>,
): number | null {
  for (const cell of headerCells) {
    if (NUMMER_HEADER.test(cleanCellText(cell.content))) {
      return cell.columnIndex;
    }
  }
  return null;
}

function detectRabattColumnIndex(
  headerCells: Array<{ columnIndex: number; content: string }>,
): number | null {
  for (const cell of headerCells) {
    const label = cleanCellText(cell.content);
    if (/mwst|ust|vat/i.test(label)) continue;
    if (RABATT_HEADER.test(label)) return cell.columnIndex;
  }
  return null;
}

function buildColumnLayout(
  headerCells: Array<{ columnIndex: number; content: string }>,
): InvoiceTableColumnLayout {
  return {
    posColumnIndex: detectPosColumnIndex(headerCells),
    mengeColumnIndex: detectMengeColumnIndex(headerCells),
    nummerColumnIndex: detectNummerColumnIndex(headerCells),
    rabattColumnIndex: detectRabattColumnIndex(headerCells),
  };
}

function parseRabattPercent(text: string): number | null {
  const trimmed = cleanCellText(text);
  if (!trimmed || /[€$]/.test(trimmed)) return null;
  const match = trimmed.match(/(-?\d+(?:[.,]\d+)?)\s*%?/);
  if (!match?.[1]) return null;
  const value = parseGermanNumber(match[1]);
  if (value == null || Math.abs(value) > 100) return null;
  return Math.abs(value);
}

function parseRowRabattPercent(
  rowCells: AzureLayoutTableCell[],
  columns: InvoiceTableColumnLayout,
): number | null {
  if (columns.rabattColumnIndex == null) return null;
  const cell = rowCells.find(
    (entry) => entry.columnIndex === columns.rabattColumnIndex,
  );
  return parseRabattPercent(cell?.content ?? "");
}

function isPosColumnCell(
  cell: AzureLayoutTableCell,
  rowCells: AzureLayoutTableCell[],
  columns: InvoiceTableColumnLayout,
): boolean {
  if (
    columns.posColumnIndex != null &&
    cell.columnIndex === columns.posColumnIndex
  ) {
    return true;
  }

  // Pos is always the leftmost plain integer (1, 2, 3 …) without unit/decimal.
  const text = cleanCellText(cell.content);
  if (!/^\d{1,3}$/.test(text)) return false;
  const leftmost = Math.min(...rowCells.map((entry) => entry.columnIndex));
  return cell.columnIndex === leftmost;
}

function tableScore(table: AzureLayoutTable): number {
  const dataCells = table.cells.filter((cell) => cell.kind !== "columnHeader").length;

  // Prefer tables on later pages. On multi-page invoices Azure Layout often
  // generates a duplicate table per page; the last page has the most complete
  // Ges.-Preis values (the first page's rightmost column may be truncated by
  // the scanner edge). A page-number bonus of 10 000 per page dominates any
  // cell-count tie between otherwise identical tables.
  const maxPage = Math.max(
    0,
    ...(table.boundingRegions ?? []).map((region) => region.pageNumber),
  );

  // € count: prefer tables whose price cells carry the currency symbol,
  // which indicates complete (non-truncated) OCR values.
  const euroCount = table.cells.filter((cell) => /€/.test(cell.content)).length;

  return dataCells + maxPage * 10_000 + euroCount;
}

/** True when the cell is primarily a quantity (not a label like "Motoröl 5W30"). */
function looksLikeQuantityCell(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || /[€$%]/.test(trimmed)) return false;
  // "7,00 Liter", "0,90", "2,00", "4", "3 Stk."
  return (
    /^\d+(?:[.,]\d{1,3})?(?:\s*(?:liter|stk\.?|stück|std\.?|h|kg|l\.?))?$/i.test(
      trimmed,
    )
  );
}

/**
 * Parse Menge from a layout row (supports "2,00", "0,90", "7,00 Liter").
 * Money cells with € are ignored. Labels with embedded digits (e.g. 5W30) are skipped.
 */
function parseRowQuantity(
  rowCells: AzureLayoutTableCell[],
  columns: InvoiceTableColumnLayout = EMPTY_COLUMN_LAYOUT,
): number | null {
  if (columns.mengeColumnIndex != null) {
    const cell = rowCells.find(
      (entry) => entry.columnIndex === columns.mengeColumnIndex,
    );
    const text = cleanCellText(cell?.content ?? "");
    if (!text || !looksLikeQuantityCell(text)) return null;
    const qty = parseGermanNumber(text);
    return qty != null && qty > 0 && qty <= 10_000 ? qty : null;
  }

  let best: { qty: number; score: number } | null = null;

  for (const cell of rowCells) {
    if (columns.nummerColumnIndex != null && cell.columnIndex === columns.nummerColumnIndex) {
      continue;
    }
    if (isPosColumnCell(cell, rowCells, columns)) continue;

    const text = cleanCellText(cell.content);
    if (!looksLikeQuantityCell(text)) continue;

    const qty = parseGermanNumber(text);
    if (qty == null || qty <= 0 || qty > 10_000) continue;

    const hasUnit = /(?:liter|stk\.?|stück|std\.?|\bh\b|kg|\bl\b)/i.test(text);
    const isDecimal = /^\d+[.,]\d{1,2}\b/i.test(text);

    let score = 0;
    if (hasUnit) {
      score += 40;
    } else if (isDecimal) {
      if (qty > 20) continue;
      score += 25;
    } else if (/^\d+$/.test(text) && qty >= 2 && qty <= 100) {
      score += 12;
    } else {
      // Plain "1" without Menge column — too ambiguous (Pos vs qty).
      continue;
    }

    if (score <= 0) continue;
    if (!best || score > best.score) best = { qty, score };
  }

  return best?.qty ?? null;
}

/**
 * When a row has Einzelpreis + Ges. Preis, always take the rightmost € value.
 * Menge cells (e.g. "2,00") are excluded from the money list so they are not
 * mistaken for a price column.
 */
export function extractRowLineTotalAmount(
  rowCells: AzureLayoutTableCell[],
  columns: InvoiceTableColumnLayout = EMPTY_COLUMN_LAYOUT,
): number | null {
  const qty = parseRowQuantity(rowCells, columns);
  const qtyColumnIndexes = new Set(
    rowCells
      .filter((cell) => {
        if (columns.nummerColumnIndex != null && cell.columnIndex === columns.nummerColumnIndex) {
          return false;
        }
        if (isPosColumnCell(cell, rowCells, columns)) return false;
        const text = cleanCellText(cell.content);
        if (!looksLikeQuantityCell(text)) return false;
        const parsed = parseGermanNumber(text);
        return parsed != null && qty != null && Math.abs(parsed - qty) < 0.001;
      })
      .map((cell) => cell.columnIndex),
  );

  const rabattPercent = parseRowRabattPercent(rowCells, columns);

  const moneyCells = rowCells
    .filter((cell) => {
      if (qtyColumnIndexes.has(cell.columnIndex)) return false;
      if (
        columns.rabattColumnIndex != null &&
        cell.columnIndex === columns.rabattColumnIndex
      ) {
        return false;
      }
      return true;
    })
    .map((cell) => ({
      columnIndex: cell.columnIndex,
      amount: parseMoneyCell(cell.content),
    }))
    .filter(
      (entry): entry is { columnIndex: number; amount: number } =>
        entry.amount != null,
    )
    .sort((a, b) => b.columnIndex - a.columnIndex);

  if (moneyCells.length === 0) return null;
  if (moneyCells.length === 1) {
    const only = moneyCells[0]!.amount;
    if (qty != null) {
      return (
        resolveInvoiceRowGesamtpreis({
          menge: qty,
          einzelpreis: only,
          gesamtpreis: null,
          rabattPercent,
        }) ?? Math.round(only * qty * 100) / 100
      );
    }
    // Only E-Preis printed — no Menge/Einh. and no Ges. Preis → not billable.
    return null;
  }

  // Rightmost = Ges. Preis, second-from-right = E-Preis. Recompute when OCR
  // garbled the printed total (e.g. 141,46 → 1,47) but Menge × E-Preis is clear.
  const gesPreis = moneyCells[0]!.amount;
  const einzelpreis = moneyCells[1]!.amount;
  if (qty == null) return gesPreis;
  return (
    resolveInvoiceRowGesamtpreis({
      menge: qty,
      einzelpreis,
      gesamtpreis: gesPreis,
      rabattPercent,
    }) ?? gesPreis
  );
}

function rowHasPos(
  rowCells: AzureLayoutTableCell[],
  columns: InvoiceTableColumnLayout,
): boolean {
  return rowCells.some((cell) => isPosColumnCell(cell, rowCells, columns));
}

function extractLineItemsFromTable(table: AzureLayoutTable): InvoiceLineItem[] {
  const headerRowIndex = table.cells.some((cell) => cell.rowIndex === 0)
    ? 0
    : Math.min(...table.cells.map((cell) => cell.rowIndex));

  const headerCells = table.cells.filter((cell) => cell.rowIndex === headerRowIndex);
  const columnLayout = buildColumnLayout(headerCells);

  const amountColumnIndex = detectAmountColumnIndex(headerCells, table.columnCount);
  const labelColumnIndex = detectLabelColumnIndex(
    headerCells,
    amountColumnIndex,
  );

  const items: InvoiceLineItem[] = [];
  const seen = new Set<string>();
  let pendingLabel: string | null = null;

  for (let rowIndex = headerRowIndex + 1; rowIndex < table.rowCount; rowIndex += 1) {
    const rowCells = table.cells.filter((cell) => cell.rowIndex === rowIndex);
    if (rowCells.length === 0) continue;

    const labelCell = rowCells.find((cell) => cell.columnIndex === labelColumnIndex);
    let label = cleanCellText(labelCell?.content ?? "");

    if (!label) {
      const textCells = rowCells
        .filter((cell) => cell.columnIndex < amountColumnIndex)
        .sort((a, b) => a.columnIndex - b.columnIndex);
      label = cleanCellText(textCells.map((cell) => cell.content).join(" "));
    }

    if (!label) continue;
    if (shouldSkipTableRow(label)) continue;

    const amount = extractRowLineTotalAmount(rowCells, columnLayout);
    const hasPos = rowHasPos(rowCells, columnLayout);
    const headerCandidate = { label, amount: amount ?? 0 };
    if (isLikelyInvoiceTableHeaderRow(headerCandidate)) continue;

    const isContinuation =
      !hasPos &&
      items.length > 0 &&
      isContinuationInvoiceLabel(label);

    if (isContinuation) {
      const last = items[items.length - 1]!;
      last.label = `${last.label} ${label}`.trim().slice(0, 160);
      if (amount != null) {
        if (
          last.amount <= 0 ||
          isUnitPriceAmountOfTotal(last.amount, amount)
        ) {
          last.amount = amount;
        } else if (amount > last.amount + 0.01) {
          last.amount = amount;
        }
      }
      continue;
    }

    if (amount == null) {
      pendingLabel = pendingLabel ? `${pendingLabel} ${label}`.trim() : label;
      continue;
    }

    const fullLabel = pendingLabel
      ? `${pendingLabel} ${label}`.trim().slice(0, 160)
      : label.slice(0, 160);
    pendingLabel = null;

    const candidate = { label: fullLabel, amount };
    const key = `${fullLabel.toLowerCase()}|${amount}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(candidate);
    if (items.length >= MAX_ITEMS) break;
  }

  return mergeContinuationInvoiceLineItems(items) ?? items;
}

function tableToPlainText(table: AzureLayoutTable): string {
  const lines: string[] = [];
  for (let rowIndex = 0; rowIndex < table.rowCount; rowIndex += 1) {
    const cells = table.cells
      .filter((cell) => cell.rowIndex === rowIndex)
      .sort((a, b) => a.columnIndex - b.columnIndex);
    const line = cells
      .map((cell) => cell.content.replace(/\|/g, " ").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join(" ");
    if (line) lines.push(line);
  }
  return lines.join("\n");
}

/** Content markdown, page lines, and table rows — tried separately for section OCR. */
export function azureLayoutTextBlobs(
  result: AzureLayoutAnalyzeResult,
): string[] {
  const blobs: string[] = [];
  if (result.content?.trim()) blobs.push(result.content);
  for (const page of result.pages) {
    const pageText = page.lines?.map((line) => line.content).join("\n") ?? "";
    if (pageText.trim()) blobs.push(pageText);
  }
  for (const table of result.tables ?? []) {
    if (table.rowCount < 2) continue;
    blobs.push(tableToPlainText(table));
  }
  return blobs;
}

export function azureLayoutPlainText(
  result: AzureLayoutAnalyzeResult,
): string {
  return azureLayoutTextBlobs(result).join("\n");
}

function pickBestWorkshopParse(
  blobs: string[],
  footerNet: number | null,
): InvoiceLineItem[] | null {
  let best: InvoiceLineItem[] | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const blob of blobs) {
    const items = extractWorkshopSectionLineItems(blob);
    if (!items?.length) continue;
    if (footerNet != null && invoiceLineItemsMatchNetTotal(items, footerNet)) {
      return items;
    }
    const sum = items.reduce((acc, item) => acc + item.amount, 0);
    const delta = footerNet != null ? Math.abs(sum - footerNet) : 0;
    if (delta < bestDelta) {
      best = items;
      bestDelta = delta;
    }
  }

  return best;
}

/**
 * Primary: Azure layout tables (row/column indices).
 * Fallback: markdown content line parser.
 */
export function extractInvoiceLineItemsFromAzureLayout(
  result: AzureLayoutAnalyzeResult,
): InvoiceLineItem[] | null {
  const layoutText = azureLayoutPlainText(result);
  const footerNet = layoutText ? extractNetSumFromText(layoutText) : null;
  const format = layoutText ? detectInvoiceTableFormat(layoutText) : "unknown";

  if (format === "workshop-sections") {
    const fromSections = pickBestWorkshopParse(
      azureLayoutTextBlobs(result),
      footerNet,
    );
    if (fromSections?.length) return fromSections;
  }

  const tables = [...(result.tables ?? [])].sort(
    (a, b) => tableScore(b) - tableScore(a),
  );

  for (const table of tables) {
    if (table.rowCount < 2 || table.columnCount < 2) continue;
    const items = extractLineItemsFromTable(table);
    if (items.length > 0) {
      return items;
    }
  }

  if (result.content) {
    const fromMarkdown = extractInvoiceLineItemsFromText(result.content);
    if (fromMarkdown?.length) return fromMarkdown;
  }

  for (const page of result.pages) {
    const pageText = page.lines?.map((line) => line.content).join("\n") ?? "";
    if (!pageText) continue;
    for (const rawLine of pageText.split("\n")) {
      const parsed = lineTotalFromInvoiceRow(rawLine);
      if (!parsed) continue;
      return extractInvoiceLineItemsFromText(pageText);
    }
  }

  return null;
}

function labelMatchScore(layoutLabel: string, llmLabel: string): number {
  const layoutKey = normalizedInvoiceLineLabelKey(layoutLabel);
  const llmKey = normalizedInvoiceLineLabelKey(llmLabel);
  if (!layoutKey || !llmKey) return 0;
  if (layoutKey === llmKey) return 100;
  if (layoutKey.includes(llmKey) || llmKey.includes(layoutKey)) return 75;

  const layoutWords = new Set(layoutKey.split(" ").filter((word) => word.length >= 3));
  const llmWords = llmKey.split(" ").filter((word) => word.length >= 3);
  const overlap = llmWords.filter((word) => layoutWords.has(word)).length;
  if (overlap >= 2) return 55 + overlap;
  if (overlap === 1) return 35;
  return 0;
}

function findBestLlmMatch(
  layoutItem: InvoiceLineItem,
  llmItems: InvoiceLineItem[],
  usedIndexes: Set<number>,
): InvoiceLineItem | null {
  let best: { index: number; item: InvoiceLineItem; score: number } | null = null;

  for (let index = 0; index < llmItems.length; index += 1) {
    if (usedIndexes.has(index)) continue;
    const llmItem = llmItems[index]!;
    let score = labelMatchScore(layoutItem.label, llmItem.label);

    if (Math.abs(llmItem.amount - layoutItem.amount) < 0.02) {
      score += 15;
    } else if (isUnitPriceAmountOfTotal(llmItem.amount, layoutItem.amount)) {
      score += 20;
    }

    if (!best || score > best.score) {
      best = { index, item: llmItem, score };
    }
  }

  if (!best || best.score < 30) return null;
  usedIndexes.add(best.index);
  return best.item;
}

function preferLongerLabel(primary: string, secondary: string): string {
  const a = primary.trim();
  const b = secondary.trim();
  if (b.length > a.length + 3) return b;
  return a;
}

function pickMergedRowAmount(
  layoutAmount: number,
  llmAmount: number | null,
): number {
  if (llmAmount == null) return layoutAmount;
  if (Math.abs(llmAmount - layoutAmount) < 0.02) return layoutAmount;
  if (isUnitPriceAmountOfTotal(llmAmount, layoutAmount)) return layoutAmount;
  return layoutAmount;
}

/**
 * Prefer Azure layout rows when they match totals better than LLM output.
 * Otherwise hybrid-merge: layout order + best amount per matched row.
 */
export function mergeLayoutAndLlmLineItems(
  llmItems: InvoiceLineItem[] | null | undefined,
  layoutItems: InvoiceLineItem[] | null | undefined,
  totalAmount: number | null,
  options: {
    trustedNetTotal?: number | null;
    /** Layout rows reconcile with Nettosumme — trust geometry exclusively. */
    preferLayoutRows?: boolean;
    /** LLM rows reconcile with Nettosumme better — trust LLM exclusively. */
    preferLlmRows?: boolean;
    /** Pos column tables: never append unmatched LLM rows (shifted-column pollution). */
    strictColumnMerge?: boolean;
  } = {},
): InvoiceLineItem[] | null {
  const layout = layoutItems ?? [];
  const llm = llmItems ?? [];

  if (layout.length === 0) return llm.length > 0 ? llm : null;
  if (llm.length === 0) return layout;

  if (options.preferLlmRows) {
    return llm;
  }

  const layoutNetSum = sumInvoiceLineItems(layout) ?? 0;
  const trustedNetTotal = options.trustedNetTotal ?? null;
  if (
    options.preferLayoutRows ||
    (trustedNetTotal != null &&
      Math.abs(layoutNetSum - trustedNetTotal) <= NET_TOTAL_TOLERANCE_EUR)
  ) {
    // The geometry-aware rows reconcile with the printed Nettosumme. Do not
    // append unmatched LLM rows: they commonly stem from a shifted price column.
    return layout;
  }

  const usedLlmIndexes = new Set<number>();
  const merged: InvoiceLineItem[] = layout.map((layoutItem) => {
    const llmMatch = findBestLlmMatch(layoutItem, llm, usedLlmIndexes);
    return {
      label: llmMatch
        ? preferLongerLabel(layoutItem.label, llmMatch.label)
        : layoutItem.label,
      amount: pickMergedRowAmount(
        layoutItem.amount,
        llmMatch?.amount ?? null,
      ),
    };
  });

  if (options.strictColumnMerge) {
    return merged;
  }

  for (let index = 0; index < llm.length; index += 1) {
    if (usedLlmIndexes.has(index)) continue;
    const llmItem = llm[index]!;

    const duplicateAmount = merged.some(
      (existing) => Math.abs(existing.amount - llmItem.amount) < 0.011,
    );
    const looksLikeUnit = merged.some((existing) =>
      isUnitPriceAmountOfTotal(llmItem.amount, existing.amount),
    );
    if (duplicateAmount || looksLikeUnit) continue;

    merged.push(llmItem);
  }

  return merged;
}
