import {
  TableDataSchema,
  type AbeVehicleContext,
  type TableData,
  type TableRow,
} from "@/lib/validations/abeSchema";

export type TableMatchResult = {
  table: TableData;
  matchedRowIds: string[];
};

/**
 * Normalize tokens for case-insensitive, punctuation-tolerant comparison.
 * Keeps alphanumerics so EG-BE codes like `e1*2001/116*0307` still match.
 */
export function normalizeMatchToken(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9*+/.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactAlnum(value: string): string {
  return normalizeMatchToken(value).replace(/[^a-z0-9]/g, "");
}

export { compactAlnum };

function headerIndex(headers: string[], candidates: string[]): number {
  const normalizedHeaders = headers.map((header) => normalizeMatchToken(header));
  for (const candidate of candidates) {
    const needle = normalizeMatchToken(candidate);
    const index = normalizedHeaders.findIndex(
      (header) => header === needle || header.includes(needle),
    );
    if (index >= 0) return index;
  }
  return -1;
}

function cellAt(row: TableRow, index: number): string {
  if (index < 0 || index >= row.cells.length) return "";
  return row.cells[index] ?? "";
}

function rowHaystack(row: TableRow): string {
  return normalizeMatchToken(row.cells.join(" "));
}

type ScoredMatch = {
  rowId: string;
  score: number;
  reason: string;
};

function scoreRow(
  row: TableRow,
  headers: string[],
  vehicle: AbeVehicleContext,
): ScoredMatch | null {
  const brand = normalizeMatchToken(vehicle.brand);
  const model = normalizeMatchToken(vehicle.model);
  const type = vehicle.type ? normalizeMatchToken(vehicle.type) : "";
  const egBe = vehicle.egBe ? normalizeMatchToken(vehicle.egBe) : "";
  const egBeCompact = vehicle.egBe ? compactAlnum(vehicle.egBe) : "";

  const brandIdx = headerIndex(headers, [
    "hersteller",
    "marke",
    "brand",
    "fzg-hersteller",
    "fahrzeughersteller",
  ]);
  const modelIdx = headerIndex(headers, [
    "modell",
    "fahrzeug",
    "type",
    "typ",
    "handelsbezeichnung",
  ]);
  const typeIdx = headerIndex(headers, [
    "typ",
    "type",
    "typschlüssel",
    "typschlussel",
    "abe-typ",
    "fahrzeugtyp",
  ]);
  const egBeIdx = headerIndex(headers, [
    "eg-be",
    "eg be",
    "egbe",
    "eg-typgenehmigung",
    "typgenehmigung",
    "genehmigung",
  ]);

  const brandCell = normalizeMatchToken(cellAt(row, brandIdx));
  const modelCell = normalizeMatchToken(cellAt(row, modelIdx));
  const typeCell = normalizeMatchToken(cellAt(row, typeIdx));
  const egBeCell = normalizeMatchToken(cellAt(row, egBeIdx));
  const haystack = rowHaystack(row);
  const haystackCompact = compactAlnum(row.cells.join(" "));

  let score = 0;
  const reasons: string[] = [];

  const brandHit =
    (brandCell && (brandCell === brand || brandCell.includes(brand))) ||
    haystack.includes(brand);
  const modelHit =
    (modelCell && (modelCell === model || modelCell.includes(model))) ||
    haystack.includes(model);

  if (brandHit) {
    score += 2;
    reasons.push(`Brand ${vehicle.brand}`);
  }
  if (modelHit) {
    score += 3;
    reasons.push(`Model ${vehicle.model}`);
  }

  if (type) {
    const typeHit =
      (typeCell && (typeCell === type || typeCell.includes(type))) ||
      haystack.includes(type) ||
      haystackCompact.includes(compactAlnum(vehicle.type ?? ""));
    if (typeHit) {
      score += 4;
      reasons.push(`Type ${vehicle.type}`);
    }
  }

  if (egBe) {
    const egHit =
      (egBeCell &&
        (egBeCell === egBe ||
          egBeCell.includes(egBe) ||
          compactAlnum(egBeCell).includes(egBeCompact))) ||
      haystack.includes(egBe) ||
      haystackCompact.includes(egBeCompact);
    if (egHit) {
      score += 5;
      reasons.push(`EG-BE ${vehicle.egBe}`);
    }
  }

  // Require at least brand+model, or a strong type/EG-BE hit with model.
  const strongId = score >= 4 && (Boolean(type) || Boolean(egBe));
  const softFit = brandHit && modelHit && score >= 5;
  if (!strongId && !softFit) {
    return null;
  }

  return {
    rowId: row.id,
    score,
    reason: `Matched by ${reasons.join(" and ")}`,
  };
}

/**
 * Flags Verwendungsbereich rows that match the user's garage vehicle.
 * Matching is deterministic string comparison — separate from LLM extraction.
 */
export class TableMatchingService {
  /**
   * Return a copy of `table` with `isUserVehicleMatch` / `matchReason` applied.
   * When `vehicle` is missing, all match flags are cleared.
   */
  matchTable(
    table: TableData,
    vehicle?: AbeVehicleContext | null,
  ): TableMatchResult {
    const parsed = TableDataSchema.parse(table);

    if (!vehicle) {
      const clearedRows = parsed.rows.map((row) => ({
        ...row,
        isUserVehicleMatch: false,
        matchReason: null,
      }));
      return {
        table: { ...parsed, rows: clearedRows },
        matchedRowIds: [],
      };
    }

    const scored = parsed.rows
      .map((row) => scoreRow(row, parsed.headers, vehicle))
      .filter((entry): entry is ScoredMatch => entry !== null)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      return {
        table: {
          ...parsed,
          rows: parsed.rows.map((row) => ({
            ...row,
            isUserVehicleMatch: false,
            matchReason: null,
          })),
        },
        matchedRowIds: [],
      };
    }

    // Prefer the single best row; ties keep every row at the top score.
    const topScore = scored[0]?.score ?? 0;
    const winners = new Map(
      scored
        .filter((entry) => entry.score === topScore)
        .map((entry) => [entry.rowId, entry.reason]),
    );

    const rows = parsed.rows.map((row) => {
      const reason = winners.get(row.id);
      if (!reason) {
        return {
          ...row,
          isUserVehicleMatch: false,
          matchReason: null,
        };
      }
      return {
        ...row,
        isUserVehicleMatch: true,
        matchReason: reason,
      };
    });

    return {
      table: { ...parsed, rows },
      matchedRowIds: [...winners.keys()],
    };
  }
}

export const tableMatchingService = new TableMatchingService();

/** Convenience wrapper — matches and returns only the annotated table. */
export function matchCompatibilityTable(
  table: TableData,
  vehicle?: AbeVehicleContext | null,
): TableData {
  return tableMatchingService.matchTable(table, vehicle).table;
}
