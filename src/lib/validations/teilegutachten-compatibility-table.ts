import { isPlausibleVehicleApproval } from "@/lib/ocr/abe-parse-schema";
import type { TableData } from "@/lib/validations/abeSchema";

export const TEILEGUTACHTEN_TABLE_HEADERS = [
  "Hersteller",
  "Typ",
  "Modell",
] as const;

type ColumnRole = "brand" | "type" | "model";

const COLUMN_RULES: { role: ColumnRole; patterns: RegExp[] }[] = [
  {
    role: "brand",
    patterns: [
      /fahrzeughersteller/i,
      /^hersteller$/i,
      /^marke$/i,
      /^brand$/i,
    ],
  },
  {
    role: "type",
    patterns: [
      /fahrzeug[\s-]*typ/i,
      /typschlüssel/i,
      /typschlussel/i,
      /^typ$/i,
      /^type$/i,
    ],
  },
  {
    role: "model",
    patterns: [/handels[\s-]*bezeichnung/i, /^modell$/i, /^fahrzeug$/i],
  },
];

function normalizeTableHeader(header: string): string {
  return header
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function scoreHeaderForRole(header: string, patterns: RegExp[]): number {
  const normalized = normalizeTableHeader(header);
  for (let index = 0; index < patterns.length; index += 1) {
    if (patterns[index]!.test(normalized)) {
      return patterns.length - index;
    }
  }
  return 0;
}

/** Resolve Verwendungsbereich column indices without confusing Typ vs Modell. */
export function resolveTeilegutachtenTableColumns(
  headers: string[],
): Record<ColumnRole, number> {
  const scores: Record<ColumnRole, { index: number; score: number }> = {
    brand: { index: -1, score: 0 },
    type: { index: -1, score: 0 },
    model: { index: -1, score: 0 },
  };

  headers.forEach((header, index) => {
    for (const rule of COLUMN_RULES) {
      const score = scoreHeaderForRole(header, rule.patterns);
      if (score > scores[rule.role].score) {
        scores[rule.role] = { index, score };
      }
    }
  });

  return {
    brand: scores.brand.index,
    type: scores.type.index,
    model: scores.model.index,
  };
}

function tableCellValue(row: { cells: string[] }, index: number): string {
  if (index < 0 || index >= row.cells.length) return "";
  return row.cells[index]?.trim().replace(/\s+/g, " ") ?? "";
}

function looksLikeBrandCell(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^\[\d+\]$/.test(trimmed)) return false;
  if (/^f\s?\d{2,4}$/i.test(trimmed)) return false;
  if (/^\d{1,4}$/.test(trimmed)) return false;
  return /[a-zäöüß]{2,}/i.test(trimmed);
}

function formatFreigabeLabel(parts: {
  brand: string;
  type: string;
  model: string;
}): string | null {
  const brand = parts.brand.trim();
  const type = parts.type.trim();
  const model = parts.model.trim();

  const segments = [
    brand || null,
    type && type !== brand ? type : null,
    model && model !== brand && model !== type ? model : null,
  ].filter(Boolean) as string[];

  if (segments.length === 0) return null;
  return segments.join(" · ").slice(0, 120);
}

/** True when text is a pipe/markdown table dump rather than clean Freigabe lines. */
export function looksLikeVerwendungsbereichTableDump(
  text: string | null | undefined,
): boolean {
  if (!text?.trim()) return false;
  if (/\|/.test(text)) return true;
  if (/fahrzeughersteller|handels[\s-]*bezeichnung|abe-nr|achslast/i.test(text)) {
    return true;
  }
  if (/^I+\.\s*Verwendungsbereich/i.test(text.trim())) return true;
  return false;
}

/**
 * Keep only vehicle-relevant columns (Hersteller · Typ · Modell).
 * Forward-fills Hersteller when OCR leaves the cell blank on continuation rows.
 */
export function sanitizeTeilegutachtenCompatibilityTable(
  table: TableData | null | undefined,
): TableData | null {
  if (!table?.rows.length) return null;

  const columns = resolveTeilegutachtenTableColumns(table.headers);
  if (columns.brand < 0 && columns.type < 0 && columns.model < 0) {
    return null;
  }

  let lastBrand = "";
  const rows: TableData["rows"] = [];

  for (const [index, row] of table.rows.entries()) {
    let brand = tableCellValue(row, columns.brand);
    if (!looksLikeBrandCell(brand)) {
      brand = lastBrand;
    } else {
      lastBrand = brand;
    }

    const type = tableCellValue(row, columns.type);
    const model = tableCellValue(row, columns.model);

    if (!brand && !type && !model) continue;

    rows.push({
      id: row.id?.trim() || `row-${index + 1}`,
      cells: [brand, type, model],
      isUserVehicleMatch: Boolean(row.isUserVehicleMatch),
      matchReason: row.matchReason?.trim() || null,
    });
  }

  if (rows.length === 0) return null;

  return {
    caption: table.caption?.trim().slice(0, 200) || "Verwendungsbereich",
    headers: [...TEILEGUTACHTEN_TABLE_HEADERS],
    rows,
  };
}

/** Map sanitized table rows → compact Freigabe labels for `vehicle_approvals`. */
export function vehicleApprovalsFromSanitizedTable(
  table: TableData | null | undefined,
): string[] | null {
  const sanitized = sanitizeTeilegutachtenCompatibilityTable(table);
  if (!sanitized?.rows.length) return null;

  const labels: string[] = [];
  for (const row of sanitized.rows) {
    const [brand = "", type = "", model = ""] = row.cells;
    const label = formatFreigabeLabel({ brand, type, model });
    if (label && isPlausibleVehicleApproval(label)) {
      labels.push(label);
    }
  }

  return labels.length > 0 ? labels : null;
}

export function formatMatchedVehicleRowFromTable(
  table: TableData | null | undefined,
  matchedRowId?: string | null,
): string | null {
  const sanitized = sanitizeTeilegutachtenCompatibilityTable(table);
  if (!sanitized?.rows.length) return null;

  const matched =
    sanitized.rows.find((row) => row.isUserVehicleMatch) ??
    (matchedRowId
      ? sanitized.rows.find((row) => row.id === matchedRowId)
      : undefined) ??
    sanitized.rows[0];

  if (!matched) return null;

  const [brand = "", type = "", model = ""] = matched.cells;
  return formatFreigabeLabel({ brand, type, model });
}
