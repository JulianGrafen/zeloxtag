/**
 * Invoice line items from Azure Document Intelligence layout tables.
 * Pairs label + Gesamtpreis per rowIndex (geometry-aware via table cells).
 */

import { isLikelyInvoiceTableHeaderRow } from "@/lib/ocr/invoice-line-item-alignment";
import {
  extractInvoiceLineItemsFromText,
  lineTotalFromInvoiceRow,
} from "@/lib/ocr/invoice-line-items-from-text";
import { parseGermanMoneyAmount } from "@/lib/ocr/parse-german-money";
import type { InvoiceLineItem } from "@/lib/ocr/text-parse-schema";

import type { AzureLayoutAnalyzeResult, AzureLayoutTable } from "./azure-document-intelligence";

const MAX_ITEMS = 60;

const UNIT_PRICE_HEADER =
  /^(?:e-?preis|einzelpreis|ep|stückpreis|stk\.?\s*preis|netto(?:preis)?|listenpreis)$/i;

const TOTAL_PRICE_HEADER =
  /^(?:ges\.?\s*preis|gesamtpreis|ges\.?\s*summe|gesamtbetrag|summe|betrag|wert|total|gp|brutto|eur)$/i;

const SKIP_ROW_LABEL =
  /^(?:summe|gesamt(?:betrag)?|zwischensumme|netto(?:betrag)?|brutto(?:betrag)?|rechnungsbetrag|zahlbetrag|mwst|ust|position(?:en)?)$/i;

function cleanCellText(value: string): string {
  return value.replace(/\|/g, " ").replace(/\s+/g, " ").trim();
}

function parseMoneyCell(value: string): number | null {
  const trimmed = cleanCellText(value);
  if (!trimmed || /%/.test(trimmed)) return null;
  return parseGermanMoneyAmount(trimmed);
}

function detectAmountColumnIndex(
  headerCells: Array<{ columnIndex: number; content: string }>,
  columnCount: number,
): number {
  let bestIndex = columnCount - 1;
  let bestScore = -1;

  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    const header = headerCells.find((cell) => cell.columnIndex === columnIndex);
    const label = cleanCellText(header?.content ?? "").toLowerCase();
    let score = 0;

    if (TOTAL_PRICE_HEADER.test(label)) score += 20;
    if (UNIT_PRICE_HEADER.test(label)) score -= 10;
    if (/^pos\.?$|^nr\.?$|^menge$|^anz/.test(label)) score -= 5;
    score += columnIndex;

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

function tableScore(table: AzureLayoutTable): number {
  return table.cells.filter((cell) => cell.kind !== "columnHeader").length;
}

function extractLineItemsFromTable(table: AzureLayoutTable): InvoiceLineItem[] {
  const headerRowIndex = table.cells.some((cell) => cell.rowIndex === 0)
    ? 0
    : Math.min(...table.cells.map((cell) => cell.rowIndex));

  const headerCells = table.cells.filter((cell) => cell.rowIndex === headerRowIndex);

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

    const amountCell = rowCells.find((cell) => cell.columnIndex === amountColumnIndex);
    let amount = parseMoneyCell(amountCell?.content ?? "");

    if (amount == null) {
      const moneyCells = rowCells
        .map((cell) => ({
          columnIndex: cell.columnIndex,
          amount: parseMoneyCell(cell.content),
        }))
        .filter(
          (entry): entry is { columnIndex: number; amount: number } =>
            entry.amount != null,
        )
        .sort((a, b) => b.columnIndex - a.columnIndex);
      amount = moneyCells[0]?.amount ?? null;
    }

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

function sumItems(items: InvoiceLineItem[] | null | undefined): number | null {
  if (!items?.length) return null;
  return Math.round(items.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
}

/**
 * Prefer Azure layout rows when they match totals better than LLM output.
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

  if (totalAmount != null && totalAmount > 0) {
    const layoutDiff = Math.abs((sumItems(layout) ?? 0) - totalAmount);
    const llmDiff = Math.abs((sumItems(llm) ?? 0) - totalAmount);
    if (layoutDiff + 0.5 < llmDiff) {
      return layout;
    }
    if (llmDiff + 0.5 < layoutDiff) {
      return llm;
    }
  }

  if (layout.length >= llm.length) {
    return layout;
  }

  return llm;
}
