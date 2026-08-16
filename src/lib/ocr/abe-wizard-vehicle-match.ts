import {
  repairAbeVehicleVerkaufsbezeichnungFragments,
  normalizeVerkaufsbezeichnungKey,
} from "@/lib/ocr/abe-wizard-vehicle-normalize";
import type { AbeVehicleContext, TableData } from "@/lib/validations/abeSchema";
import type { AbeVehicleMatch } from "@/lib/validations/abeWizardSchemas";
import { scoreHaystackAgainstGarageVehicle } from "@/lib/ocr/abe-garage-vehicle-match";
import {
  compactAlnum,
  matchCompatibilityTable,
  normalizeMatchToken,
  tableMatchingService,
} from "@/services/ocr/TableMatchingService";

export type AbeVehicleGroup = {
  verkaufsbezeichnung: string;
  rows: AbeVehicleMatch[];
};

export type AbeVehicleRowScopeOptions = {
  vehicleContext?: AbeVehicleContext | null;
  /** Explicit row index within the selected group. */
  rowIndex?: number | null;
  /** When true, use all rows of the selected group if no garage row match exists. */
  fallbackToGroupRows?: boolean;
};

/** @deprecated Import from abe-wizard-vehicle-normalize */
export { normalizeVerkaufsbezeichnungKey } from "@/lib/ocr/abe-wizard-vehicle-normalize";

const VEHICLE_MODEL_BRAND_PREFIX =
  /^(?:BMW|MINI|Mercedes-Benz|Mercedes|Audi|VW|Volkswagen|Porsche|Opel|Skoda|Seat|Cupra|Ford|Toyota|Honda|Hyundai|Kia|Mazda|Volvo|Peugeot|Citro[eë]n|Renault|Fiat|Alfa Romeo)\s+/i;

/** Short model label for picker cards — e.g. "BMW 3er-Reihe" → "3er-Reihe". */
export function displayAbeVehicleModelOptionLabel(
  verkaufsbezeichnung: string,
): string {
  const key = normalizeVerkaufsbezeichnungKey(verkaufsbezeichnung);
  const withoutBrand = key.replace(VEHICLE_MODEL_BRAND_PREFIX, "").trim();
  return withoutBrand || key;
}

/** User-facing variant label — e.g. "BMW 3er-Reihe · 346L". */
export function displayAbeVehicleVariantOptionLabel(
  verkaufsbezeichnung: string,
  row: AbeVehicleMatch,
): string {
  const model = normalizeVerkaufsbezeichnungKey(verkaufsbezeichnung);
  const typ = row.fahrzeugtyp?.trim();
  if (typ) return `${model} · ${typ}`;
  return model;
}

export function abeVehicleRowId(rowIndex: number): string {
  return `abe-row-${rowIndex}`;
}

export type AbeVehicleVariantOption = {
  groupIndex: number;
  rowIndex: number;
  rowId: string;
  label: string;
  hint: string | null;
  suggested: boolean;
};

function rowHasSelectableVariant(row: AbeVehicleMatch): boolean {
  return Boolean(row.fahrzeugtyp?.trim() || row.typeApproval?.trim());
}

export function countAbeVehicleVariants(groups: readonly AbeVehicleGroup[]): number {
  return groups.reduce(
    (total, group) =>
      total + group.rows.filter(rowHasSelectableVariant).length,
    0,
  );
}

function rowMatchesGarageIdentity(
  row: AbeVehicleMatch,
  vehicle: AbeVehicleContext,
): boolean {
  const type = vehicle.type ? normalizeMatchToken(vehicle.type) : "";
  const egBe = vehicle.egBe ? normalizeMatchToken(vehicle.egBe) : "";
  const egBeCompact = vehicle.egBe ? compactAlnum(vehicle.egBe) : "";

  if (type && normalizeMatchToken(row.fahrzeugtyp ?? "") === type) {
    return true;
  }
  if (egBe && row.typeApproval) {
    const approval = normalizeMatchToken(row.typeApproval);
    if (
      approval.includes(egBe) ||
      compactAlnum(row.typeApproval).includes(egBeCompact)
    ) {
      return true;
    }
  }
  return false;
}

export function findSuggestedAbeVehicleVariant(
  matches: readonly AbeVehicleMatch[],
  vehicleContext?: AbeVehicleContext | null,
): { groupIndex: number; rowIndex: number } | null {
  if (!vehicleContext) return null;

  const groups = groupAbeVehicleMatches([...matches]);
  const requiresIdentity = Boolean(
    vehicleContext.type?.trim() || vehicleContext.egBe?.trim(),
  );
  let bestGroupIndex = -1;
  let bestRowIndex = -1;
  let bestScore = 0;

  groups.forEach((group, groupIndex) => {
    group.rows.forEach((row, rowIndex) => {
      if (requiresIdentity && !rowMatchesGarageIdentity(row, vehicleContext)) {
        return;
      }
      const score = scoreAbeVehicleRow(row, vehicleContext);
      if (score >= 2 && score > bestScore) {
        bestScore = score;
        bestGroupIndex = groupIndex;
        bestRowIndex = rowIndex;
      }
    });
  });

  if (bestScore < 2) return null;
  return { groupIndex: bestGroupIndex, rowIndex: bestRowIndex };
}

/** Flat list of selectable vehicle rows (model + Fahrzeugtyp), one Auflagen block each. */
export function listAbeVehicleVariantOptions(
  matches: readonly AbeVehicleMatch[],
  vehicleContext?: AbeVehicleContext | null,
): AbeVehicleVariantOption[] {
  const groups = groupAbeVehicleMatches([...matches]);
  const suggested = findSuggestedAbeVehicleVariant(matches, vehicleContext);
  const options: AbeVehicleVariantOption[] = [];

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const group = groups[groupIndex]!;
    group.rows.forEach((row, rowIndex) => {
      if (!rowHasSelectableVariant(row)) return;
      options.push({
        groupIndex,
        rowIndex,
        rowId: abeVehicleRowId(rowIndex),
        label: displayAbeVehicleVariantOptionLabel(
          group.verkaufsbezeichnung,
          row,
        ),
        hint: row.tireSizes[0]?.trim() || row.driveType?.trim() || null,
        suggested:
          suggested?.groupIndex === groupIndex &&
          suggested.rowIndex === rowIndex,
      });
    });
  }

  return options;
}

export function groupAbeVehicleMatches(
  matches: AbeVehicleMatch[],
): AbeVehicleGroup[] {
  const repaired = repairAbeVehicleVerkaufsbezeichnungFragments(matches);
  const order: string[] = [];
  const byKey = new Map<string, AbeVehicleMatch[]>();

  for (const match of repaired) {
    const key = normalizeVerkaufsbezeichnungKey(match.verkaufsbezeichnung ?? "");
    if (!key) continue;
    if (!byKey.has(key)) order.push(key);
    const rows = byKey.get(key) ?? [];
    rows.push({ ...match, verkaufsbezeichnung: key });
    byKey.set(key, rows);
  }

  return order.map((verkaufsbezeichnung) => ({
    verkaufsbezeichnung,
    rows: byKey.get(verkaufsbezeichnung) ?? [],
  }));
}

function rowMatchHaystack(row: AbeVehicleMatch): string {
  return [
    row.verkaufsbezeichnung,
    row.fahrzeugtyp ?? "",
    row.typeApproval ?? "",
    row.driveType ?? "",
    row.tireSizes.join(" "),
  ].join(" ");
}

export function scoreAbeVehicleRow(
  row: AbeVehicleMatch,
  vehicle: AbeVehicleContext,
): number {
  let score = scoreHaystackAgainstGarageVehicle(rowMatchHaystack(row), vehicle);

  const type = vehicle.type ? normalizeMatchToken(vehicle.type) : "";
  const egBe = vehicle.egBe ? normalizeMatchToken(vehicle.egBe) : "";
  const egBeCompact = vehicle.egBe ? compactAlnum(vehicle.egBe) : "";
  const rowHaystack = normalizeMatchToken(rowMatchHaystack(row));

  if (type && rowHaystack.includes(type)) score += 4;
  if (egBe && row.typeApproval) {
    const approval = normalizeMatchToken(row.typeApproval);
    if (
      approval.includes(egBe) ||
      compactAlnum(row.typeApproval).includes(egBeCompact)
    ) {
      score += 5;
    }
  }

  return score;
}

export function scoreAbeVehicleGroup(
  group: AbeVehicleGroup,
  vehicle: AbeVehicleContext,
): number {
  let score = scoreHaystackAgainstGarageVehicle(group.verkaufsbezeichnung, vehicle);

  for (const row of group.rows) {
    score = Math.max(score, scoreAbeVehicleRow(row, vehicle));
  }

  return score;
}

export function findBestAbeVehicleGroupIndex(
  groups: AbeVehicleGroup[],
  vehicle: AbeVehicleContext | null | undefined,
): number | null {
  if (!vehicle || groups.length === 0) return null;

  let bestIndex: number | null = null;
  let bestScore = 0;

  groups.forEach((group, index) => {
    const score = scoreAbeVehicleGroup(group, vehicle);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestScore >= 2 ? bestIndex : null;
}

export function findBestAbeVehicleRowIndices(
  group: AbeVehicleGroup,
  vehicle: AbeVehicleContext | null | undefined,
): number[] {
  if (!vehicle || group.rows.length === 0) return [];

  const table = vehicleGroupRowsToTableData(group);
  const matched = tableMatchingService.matchTable(table, vehicle);
  if (matched.matchedRowIds.length === 0) {
    let bestIndex: number | null = null;
    let bestScore = 0;
    group.rows.forEach((row, index) => {
      const score = scoreAbeVehicleRow(row, vehicle);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    return bestScore >= 2 && bestIndex !== null ? [bestIndex] : [];
  }

  return matched.matchedRowIds
    .map((rowId) => Number.parseInt(rowId.replace(/^abe-row-/, ""), 10))
    .filter((index) => Number.isFinite(index) && index >= 0);
}

export function resolveInitialAbeVehicleGroupIndex(
  groups: AbeVehicleGroup[],
  vehicleContext?: AbeVehicleContext | null,
): number | null {
  if (groups.length === 0) return null;
  if (groups.length === 1) return 0;
  return findBestAbeVehicleGroupIndex(groups, vehicleContext);
}

/** Pick the vehicle group for hunt / save when the user has not chosen manually. */
export function resolveAbeHuntGroupIndex(
  groups: AbeVehicleGroup[],
  vehicleContext?: AbeVehicleContext | null,
  currentIndex?: number | null,
): number | null {
  if (groups.length === 0) return null;
  if (
    currentIndex !== null &&
    currentIndex !== undefined &&
    currentIndex >= 0 &&
    currentIndex < groups.length
  ) {
    return currentIndex;
  }
  return resolveInitialAbeVehicleGroupIndex(groups, vehicleContext);
}

export function verkaufsbezeichnungForAbeHuntGroup(
  groups: AbeVehicleGroup[],
  groupIndex: number | null,
): string | null {
  if (groupIndex === null) return null;
  return groups[groupIndex]?.verkaufsbezeichnung ?? null;
}

export function requiresAbeVehicleGroupSelection(
  groups: AbeVehicleGroup[],
): boolean {
  return groups.length > 1;
}

export function isAbeVehicleTableSelectionReady(
  groups: AbeVehicleGroup[],
  selectedGroupIndex: number | null,
  selectedRowId: string | null,
): boolean {
  if (groups.length === 0) return true;
  if (countAbeVehicleVariants(groups) <= 1) return true;

  const groupIndex =
    selectedGroupIndex ?? (groups.length === 1 ? 0 : null);
  if (groupIndex === null) return false;

  const group = groups[groupIndex];
  if (!group) return false;
  if (group.rows.length <= 1) return true;

  return selectedRowId !== null;
}

export function rowIndexFromAbeRowId(rowId: string | null | undefined): number | null {
  if (!rowId) return null;
  const match = /^abe-row-(\d+)$/.exec(rowId);
  if (!match?.[1]) return null;
  const index = Number.parseInt(match[1], 10);
  return Number.isFinite(index) && index >= 0 ? index : null;
}

export function defaultAbeRowIdForGroup(group: AbeVehicleGroup): string | null {
  if (group.rows.length !== 1) return null;
  return "abe-row-0";
}

export function auflagenForUserVehicleSelection(
  report: {
    auflagenCodes: string[];
    vehicleMatches: AbeVehicleMatch[];
  },
  selectedGroupIndex: number | null,
  selectedRowId: string | null,
  _vehicleContext?: AbeVehicleContext | null,
): string[] {
  const groups = groupAbeVehicleMatches(report.vehicleMatches);
  if (groups.length === 0) {
    return report.auflagenCodes;
  }

  const groupIndex =
    selectedGroupIndex ?? (groups.length === 1 ? 0 : null);
  if (groupIndex === null) return [];

  const group = groups[groupIndex];
  if (!group) return [];

  const rowIndex = rowIndexFromAbeRowId(selectedRowId);
  const effectiveRowIndex =
    rowIndex ?? (group.rows.length === 1 ? 0 : null);
  if (effectiveRowIndex === null) return [];

  return auflagenForAbeVehicleGroup(group, {
    rowIndex: effectiveRowIndex,
  });
}

export function selectedAbeVehicleGroup(
  report: { vehicleMatches: AbeVehicleMatch[] },
  selectedGroupIndex: number | null,
): AbeVehicleGroup | null {
  const groups = groupAbeVehicleMatches(report.vehicleMatches);
  if (groups.length === 0) return null;
  const groupIndex =
    selectedGroupIndex ?? (groups.length === 1 ? 0 : null);
  if (groupIndex === null) return null;
  return groups[groupIndex] ?? null;
}

export function abeVehicleGroupKey(group: AbeVehicleGroup, index: number): string {
  return `abe-group-${index}-${group.verkaufsbezeichnung}`;
}

export function vehicleGroupRowsToTableData(
  group: AbeVehicleGroup,
  vehicleContext?: AbeVehicleContext | null,
): TableData {
  const base: TableData = {
    caption: group.verkaufsbezeichnung,
    headers: [
      "Fahrzeugtyp",
      "Typgenehmigung",
      "Antrieb",
      "Reifen",
      "Auflagen",
    ],
    rows: group.rows.map((row, index) => ({
      id: `abe-row-${index}`,
      cells: [
        row.fahrzeugtyp?.trim() || "—",
        row.typeApproval?.trim() || "—",
        row.driveType?.trim() || "—",
        row.tireSizes.length > 0 ? row.tireSizes.join(", ") : "—",
        row.auflagenCodes.length > 0 ? row.auflagenCodes.join(", ") : "—",
      ],
      isUserVehicleMatch: false,
      matchReason: null,
    })),
  };

  return matchCompatibilityTable(base, vehicleContext);
}

function scopedRowsForGroup(
  group: AbeVehicleGroup,
  options: AbeVehicleRowScopeOptions = {},
): AbeVehicleMatch[] {
  if (group.rows.length === 0) return [];

  if (
    options.rowIndex !== null &&
    options.rowIndex !== undefined &&
    options.rowIndex >= 0 &&
    options.rowIndex < group.rows.length
  ) {
    return [group.rows[options.rowIndex]!];
  }

  if (options.vehicleContext) {
    const matchedIndices = findBestAbeVehicleRowIndices(
      group,
      options.vehicleContext,
    );
    if (matchedIndices.length > 0) {
      return matchedIndices
        .map((index) => group.rows[index])
        .filter((row): row is AbeVehicleMatch => Boolean(row));
    }
  }

  if (group.rows.length === 1) {
    return group.rows;
  }

  if (options.fallbackToGroupRows) {
    return group.rows;
  }

  return [];
}

export function auflagenForAbeVehicleGroup(
  group: AbeVehicleGroup | null | undefined,
  options: AbeVehicleRowScopeOptions = {},
): string[] {
  if (!group) return [];

  const rows = scopedRowsForGroup(group, options);
  if (rows.length === 0) return [];

  return Array.from(
    new Set(
      rows.flatMap((row) =>
        row.auflagenCodes.map((code) => code.trim()).filter(Boolean),
      ),
    ),
  );
}

type ResolveAuflagenOptions = AbeVehicleRowScopeOptions & {
  selectedVerkaufsbezeichnung?: string | null;
};

/**
 * Auflagen for save / completeness checks: scoped to the selected vehicle group
 * and, when possible, the garage-matched table row only.
 */
export function resolveAuflagenCodesForReport(
  report: {
    auflagenCodes: string[];
    vehicleMatches: AbeVehicleMatch[];
  },
  options: ResolveAuflagenOptions = {},
): string[] {
  const groups = groupAbeVehicleMatches(report.vehicleMatches);
  if (groups.length === 0) {
    return report.auflagenCodes;
  }

  const selectedKey = options.selectedVerkaufsbezeichnung
    ? normalizeVerkaufsbezeichnungKey(options.selectedVerkaufsbezeichnung)
    : null;

  let group: AbeVehicleGroup | null = null;
  if (selectedKey) {
    group =
      groups.find(
        (candidate) =>
          normalizeVerkaufsbezeichnungKey(candidate.verkaufsbezeichnung) ===
          selectedKey,
      ) ?? null;
  }
  if (!group && options.vehicleContext) {
    const bestIndex = findBestAbeVehicleGroupIndex(
      groups,
      options.vehicleContext,
    );
    group = bestIndex !== null ? groups[bestIndex] ?? null : null;
  }
  if (!group && groups.length === 1) {
    group = groups[0] ?? null;
  }

  if (!group) return [];

  const scoped = auflagenForAbeVehicleGroup(group, {
    vehicleContext: options.vehicleContext,
    rowIndex: options.rowIndex,
    fallbackToGroupRows: Boolean(selectedKey),
  });
  return scoped;
}

export function selectedVerkaufsbezeichnungPayload(
  group: AbeVehicleGroup,
  vehicleContext?: AbeVehicleContext | null,
  selectedRowId?: string | null,
): {
  verkaufsbezeichnung: string;
  vehicleTable: TableData;
} {
  const table = vehicleGroupRowsToTableData(group, vehicleContext);
  const rowIndex = rowIndexFromAbeRowId(selectedRowId ?? null);
  const selectedRow =
    rowIndex !== null ? table.rows[rowIndex] ?? null : null;
  const garageMatchedRows = table.rows.filter((row) => row.isUserVehicleMatch);
  const rowsToSave =
    selectedRow !== null
      ? [selectedRow]
      : table.rows.length === 1
        ? table.rows
        : garageMatchedRows.length > 0
          ? garageMatchedRows
          : table.rows;

  return {
    verkaufsbezeichnung: group.verkaufsbezeichnung,
    vehicleTable: {
      ...table,
      rows: rowsToSave.length > 0 ? rowsToSave : table.rows,
    },
  };
}

/** @deprecated Row-level helper kept for legacy documents. */
export function formatAbeVehicleApprovalLine(match: AbeVehicleMatch): string {
  const tireSuffix =
    match.tireSizes.length > 0 ? ` – ${match.tireSizes.join(", ")}` : "";
  const driveSuffix = match.driveType ? ` (${match.driveType})` : "";
  return `${match.verkaufsbezeichnung}${driveSuffix}${tireSuffix}`;
}
