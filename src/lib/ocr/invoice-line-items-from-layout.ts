/**
 * Invoice line items from Azure Document Intelligence layout tables.
 * Pairs label + Gesamtpreis per rowIndex (geometry-aware via table cells).
 */

import {
  isUnitPriceAmountOfTotal,
  normalizedInvoiceLineLabelKey,
} from "@/lib/ocr/invoice-line-item-dedupe";
import { isLikelyInvoiceTableHeaderRow } from "@/lib/ocr/invoice-line-item-alignment";
import {
  extractInvoiceLineItemsFromText,
  lineTotalFromInvoiceRow,
} from "@/lib/ocr/invoice-line-items-from-text";
import { parseGermanMoneyAmount } from "@/lib/ocr/parse-german-money";
import type { InvoiceLineItem } from "@/lib/ocr/text-parse-schema";
import { parseGermanNumber } from "@/utils/invoiceMath";

import type {
  AzureLayoutAnalyzeResult,
  AzureLayoutTable,
  AzureLayoutTableCell,
} from "./azure-document-intelligence";

const MAX_ITEMS = 60;

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

export type InvoiceTableColumnLayout = {
  posColumnIndex: number | null;
  mengeColumnIndex: number | null;
  nummerColumnIndex: number | null;
};

const EMPTY_COLUMN_LAYOUT: InvoiceTableColumnLayout = {
  posColumnIndex: null,
  mengeColumnIndex: null,
  nummerColumnIndex: null,
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

function buildColumnLayout(
  headerCells: Array<{ columnIndex: number; content: string }>,
): InvoiceTableColumnLayout {
  return {
    posColumnIndex: detectPosColumnIndex(headerCells),
    mengeColumnIndex: detectMengeColumnIndex(headerCells),
    nummerColumnIndex: detectNummerColumnIndex(headerCells),
  };
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
  return table.cells.filter((cell) => cell.kind !== "columnHeader").length;
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

  const moneyCells = rowCells
    .filter((cell) => !qtyColumnIndexes.has(cell.columnIndex))
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
      if (Math.abs(qty - 1) > 0.001) {
        return Math.round(only * qty * 100) / 100;
      }
      return only;
    }
    // Only E-Preis printed — no Menge/Einh. and no Ges. Preis → not billable.
    return null;
  }

  const rightmost = moneyCells[0]!;
  const second = moneyCells[1]!;

  if (rightmost.amount + 0.01 >= second.amount) {
    return rightmost.amount;
  }

  if (isUnitPriceAmountOfTotal(rightmost.amount, second.amount)) {
    return second.amount;
  }

  return rightmost.amount;
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

    const amount = extractRowLineTotalAmount(rowCells, columnLayout);

    if (amount == null || !label) continue;
    if (shouldSkipTableRow(label)) continue;

    const candidate = { label, amount };
    if (isLikelyInvoiceTableHeaderRow(candidate)) continue;

    const key = `${label.toLowerCase()}|${amount}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(candidate);
    if (items.length >= MAX_ITEMS) break;
  }

  return items;
}

/**
 * Primary: Azure layout tables (row/column indices).
 * Fallback: markdown content line parser.
 */
export function extractInvoiceLineItemsFromAzureLayout(
  result: AzureLayoutAnalyzeResult,
): InvoiceLineItem[] | null {
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

/**
 * Prefer Azure layout rows when they match totals better than LLM output.
 * Amounts always come from layout (rightmost Ges. Preis column); labels from LLM when clearer.
 */
export function mergeLayoutAndLlmLineItems(
  llmItems: InvoiceLineItem[] | null | undefined,
  layoutItems: InvoiceLineItem[] | null | undefined,
  totalAmount: number | null,
): InvoiceLineItem[] | null {
  const layout = layoutItems ?? [];
  const llm = llmItems ?? [];

  if (layout.length === 0) return llm.length > 0 ? llm : null;
  if (llm.length === 0) return layout;

  const usedLlmIndexes = new Set<number>();
  const merged: InvoiceLineItem[] = layout.map((layoutItem) => {
    const llmMatch = findBestLlmMatch(layoutItem, llm, usedLlmIndexes);
    return {
      label: llmMatch
        ? preferLongerLabel(layoutItem.label, llmMatch.label)
        : layoutItem.label,
      amount: layoutItem.amount,
    };
  });

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
