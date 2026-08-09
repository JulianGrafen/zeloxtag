/**
 * Invoice line items from Azure Document Intelligence layout tables.
 * Gesamtpreis = Menge × E-Preis (validated against Ges.-Spalte when present).
 */

import { isLikelyInvoiceTableHeaderRow } from "@/lib/ocr/invoice-line-item-alignment";
import {
  isUnitPriceAmountOfTotal,
  normalizedInvoiceLineLabelKey,
} from "@/lib/ocr/invoice-line-item-dedupe";
import {
  extractInvoiceLineItemsFromText,
  lineTotalFromInvoiceRow,
} from "@/lib/ocr/invoice-line-items-from-text";
import {
  detectLineTotalColumnIndex,
  detectQuantityColumnIndex,
  detectUnitPriceColumnIndex,
  parseInvoiceQuantityCell,
  readQuantityFromRowCells,
  resolveInvoiceLineTotalAmount,
} from "@/lib/ocr/invoice-line-total";
import { parseGermanMoneyAmount } from "@/lib/ocr/parse-german-money";
import type { InvoiceLineItem } from "@/lib/ocr/text-parse-schema";

import type {
  AzureLayoutAnalyzeResult,
  AzureLayoutTable,
  AzureLayoutTableCell,
} from "./azure-document-intelligence";

const MAX_ITEMS = 60;

const SKIP_ROW_LABEL =
  /^(?:summe|gesamt(?:betrag)?|zwischensumme|netto(?:betrag)?|brutto(?:betrag)?|rechnungsbetrag|zahlbetrag|mwst|ust|position(?:en)?)$/i;

function cleanCellText(value: string): string {
  return value.replace(/\|/g, " ").replace(/\s+/g, " ").trim();
}

function parseMoneyCell(value: string): number | null {
  const trimmed = cleanCellText(value);
  if (!trimmed || /%/.test(trimmed)) return null;
  if (!/,\d{2}$/.test(trimmed) && !/\.\d{2}$/.test(trimmed)) return null;
  return parseGermanMoneyAmount(trimmed);
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

function tableScore(table: AzureLayoutTable): number {
  return table.cells.filter((cell) => cell.kind !== "columnHeader").length;
}

type TableColumnMap = {
  labelColumnIndex: number;
  quantityColumnIndex: number | null;
  unitColumnIndex: number | null;
  totalColumnIndex: number | null;
};

function buildTableColumnMap(table: AzureLayoutTable): TableColumnMap {
  const headerRowIndex = table.cells.some((cell) => cell.rowIndex === 0)
    ? 0
    : Math.min(...table.cells.map((cell) => cell.rowIndex));
  const headerCells = table.cells.filter((cell) => cell.rowIndex === headerRowIndex);

  const totalColumnIndex = detectLineTotalColumnIndex(headerCells, table.columnCount);
  const unitColumnIndex = detectUnitPriceColumnIndex(headerCells);
  const labelColumnIndex = detectLabelColumnIndex(
    headerCells,
    totalColumnIndex ?? table.columnCount - 1,
  );
  const quantityColumnIndex = detectQuantityColumnIndex(
    headerCells,
    labelColumnIndex,
    unitColumnIndex,
    totalColumnIndex,
    table.columnCount,
  );

  return {
    labelColumnIndex,
    quantityColumnIndex,
    unitColumnIndex,
    totalColumnIndex,
  };
}

function readMoneyFromColumn(
  rowCells: AzureLayoutTableCell[],
  columnIndex: number | null,
): number | null {
  if (columnIndex == null) return null;
  const cell = rowCells.find((entry) => entry.columnIndex === columnIndex);
  return parseMoneyCell(cell?.content ?? "");
}

function inferUnitAndTotalFromMoneyCells(
  rowCells: AzureLayoutTableCell[],
  unitColumnIndex: number | null,
  totalColumnIndex: number | null,
): { unitPrice: number | null; statedTotal: number | null } {
  const unitFromColumn = readMoneyFromColumn(rowCells, unitColumnIndex);
  const totalFromColumn = readMoneyFromColumn(rowCells, totalColumnIndex);

  if (unitFromColumn != null || totalFromColumn != null) {
    return { unitPrice: unitFromColumn, statedTotal: totalFromColumn };
  }

  const moneyCells = rowCells
    .map((cell) => ({
      columnIndex: cell.columnIndex,
      amount: parseMoneyCell(cell.content),
    }))
    .filter(
      (entry): entry is { columnIndex: number; amount: number } =>
        entry.amount != null,
    )
    .sort((a, b) => a.columnIndex - b.columnIndex);

  if (moneyCells.length === 0) {
    return { unitPrice: null, statedTotal: null };
  }

  if (moneyCells.length === 1) {
    return { unitPrice: moneyCells[0]!.amount, statedTotal: moneyCells[0]!.amount };
  }

  return {
    unitPrice: moneyCells[moneyCells.length - 2]!.amount,
    statedTotal: moneyCells[moneyCells.length - 1]!.amount,
  };
}

/**
 * Resolve Gesamtpreis for one table row (Menge × E-Preis, validated against Ges.-Spalte).
 */
export function extractRowLineTotalAmount(
  rowCells: AzureLayoutTableCell[],
  columns: TableColumnMap = inferColumnMapFromRow(rowCells),
): number | null {
  const quantity = readQuantityFromRowCells(
    rowCells,
    columns.quantityColumnIndex,
    columns.labelColumnIndex,
    columns.unitColumnIndex,
    columns.totalColumnIndex,
  );
  let { unitPrice, statedTotal } = inferUnitAndTotalFromMoneyCells(
    rowCells,
    columns.unitColumnIndex,
    columns.totalColumnIndex,
  );

  if (quantity != null && quantity > 1) {
    if (unitPrice == null && statedTotal != null) {
      unitPrice = statedTotal;
      statedTotal = null;
    } else if (
      unitPrice != null &&
      statedTotal != null &&
      Math.abs(unitPrice - statedTotal) < 0.02
    ) {
      statedTotal = null;
    }
  }

  const resolved = resolveInvoiceLineTotalAmount({
    quantity,
    unitPrice,
    statedTotal,
  });

  if (resolved != null) return resolved;

  // Last resort: rightmost money when parts could not be classified.
  const moneyCells = rowCells
    .map((cell) => parseMoneyCell(cell.content))
    .filter((amount): amount is number => amount != null);
  return moneyCells.at(-1) ?? null;
}

function inferColumnMapFromRow(rowCells: AzureLayoutTableCell[]): TableColumnMap {
  const labelColumnIndex =
    rowCells.find((cell) => /[a-zäöüß]{3,}/i.test(cleanCellText(cell.content)))
      ?.columnIndex ?? 1;

  const moneyColumns = rowCells
    .filter((cell) => parseMoneyCell(cell.content) != null)
    .map((cell) => cell.columnIndex)
    .sort((a, b) => a - b);

  return {
    labelColumnIndex,
    quantityColumnIndex:
      moneyColumns.length > 0
        ? rowCells.find(
            (cell) =>
              cell.columnIndex > labelColumnIndex &&
              cell.columnIndex < moneyColumns[0]! &&
              parseInvoiceQuantityCell(cell.content) != null,
          )?.columnIndex ?? null
        : null,
    unitColumnIndex:
      moneyColumns.length >= 2 ? moneyColumns[moneyColumns.length - 2]! : null,
    totalColumnIndex: moneyColumns.at(-1) ?? null,
  };
}

function extractLineItemsFromTable(table: AzureLayoutTable): InvoiceLineItem[] {
  const headerRowIndex = table.cells.some((cell) => cell.rowIndex === 0)
    ? 0
    : Math.min(...table.cells.map((cell) => cell.rowIndex));
  const columns = buildTableColumnMap(table);

  const items: InvoiceLineItem[] = [];
  const seen = new Set<string>();

  for (let rowIndex = headerRowIndex + 1; rowIndex < table.rowCount; rowIndex += 1) {
    const rowCells = table.cells.filter((cell) => cell.rowIndex === rowIndex);
    if (rowCells.length === 0) continue;

    const labelCell = rowCells.find(
      (cell) => cell.columnIndex === columns.labelColumnIndex,
    );
    let label = cleanCellText(labelCell?.content ?? "");

    if (!label) {
      const textCells = rowCells
        .filter(
          (cell) =>
            cell.columnIndex < (columns.totalColumnIndex ?? table.columnCount),
        )
        .sort((a, b) => a.columnIndex - b.columnIndex);
      label = cleanCellText(textCells.map((cell) => cell.content).join(" "));
    }

    const amount = extractRowLineTotalAmount(rowCells, columns);

    if (amount == null || !label) continue;
    if (SKIP_ROW_LABEL.test(label)) continue;

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
 * Amounts always come from layout (Gesamtpreis); labels from LLM when clearer.
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
