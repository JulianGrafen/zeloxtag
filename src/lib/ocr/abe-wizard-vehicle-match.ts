import type { AbeVehicleContext, TableData } from "@/lib/validations/abeSchema";
import type { AbeVehicleMatch } from "@/lib/validations/abeWizardSchemas";
import {
  compactAlnum,
  normalizeMatchToken,
} from "@/services/ocr/TableMatchingService";

export type AbeVehicleGroup = {
  verkaufsbezeichnung: string;
  rows: AbeVehicleMatch[];
};

/** Canonical label for grouping rows under the same section header. */
export function normalizeVerkaufsbezeichnungKey(value: string): string {
  return value
    .replace(/^verkaufsbezeichnung\s*:\s*/i, "")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

export function groupAbeVehicleMatches(
  matches: AbeVehicleMatch[],
): AbeVehicleGroup[] {
  const order: string[] = [];
  const byKey = new Map<string, AbeVehicleMatch[]>();

  for (const match of matches) {
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

export function scoreAbeVehicleGroup(
  group: AbeVehicleGroup,
  vehicle: AbeVehicleContext,
): number {
  const haystack = normalizeMatchToken(group.verkaufsbezeichnung);
  const brand = normalizeMatchToken(vehicle.brand);
  const model = normalizeMatchToken(vehicle.model);

  let score = 0;
  if (brand && haystack.includes(brand)) score += 2;
  if (model && haystack.includes(model)) score += 3;

  for (const token of model.split(" ").filter((part) => part.length >= 2)) {
    if (haystack.includes(token)) score += 1;
  }

  for (const row of group.rows) {
    const rowHaystack = normalizeMatchToken(
      [row.typeApproval ?? "", row.fahrzeugtyp ?? ""].join(" "),
    );
    const type = vehicle.type ? normalizeMatchToken(vehicle.type) : "";
    const egBe = vehicle.egBe ? normalizeMatchToken(vehicle.egBe) : "";
    const egBeCompact = vehicle.egBe ? compactAlnum(vehicle.egBe) : "";

    if (type && rowHaystack.includes(type)) score += 2;
    if (egBe && row.typeApproval) {
      const approval = normalizeMatchToken(row.typeApproval);
      if (
        approval.includes(egBe) ||
        compactAlnum(row.typeApproval).includes(egBeCompact)
      ) {
        score += 3;
      }
    }
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

  return bestScore >= 3 ? bestIndex : null;
}

export function resolveInitialAbeVehicleGroupIndex(
  groups: AbeVehicleGroup[],
): number | null {
  if (groups.length === 0) return null;
  if (groups.length === 1) return 0;
  return null;
}

export function requiresAbeVehicleGroupSelection(
  groups: AbeVehicleGroup[],
): boolean {
  return groups.length > 1;
}

export function abeVehicleGroupKey(group: AbeVehicleGroup, index: number): string {
  return `abe-group-${index}-${group.verkaufsbezeichnung}`;
}

export function vehicleGroupRowsToTableData(group: AbeVehicleGroup): TableData {
  return {
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
}

export function auflagenForAbeVehicleGroup(
  group: AbeVehicleGroup | null | undefined,
): string[] {
  if (!group) return [];
  return Array.from(
    new Set(
      group.rows.flatMap((row) =>
        row.auflagenCodes.map((code) => code.trim()).filter(Boolean),
      ),
    ),
  );
}

type ResolveAuflagenOptions = {
  selectedVerkaufsbezeichnung?: string | null;
  vehicleContext?: AbeVehicleContext | null;
};

/**
 * Auflagen for save / completeness checks: scoped to the selected or matched
 * vehicle group — never merged from other table sections above/below.
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

  const fromGroup = auflagenForAbeVehicleGroup(group);
  if (fromGroup.length > 0) return fromGroup;

  return report.auflagenCodes;
}

export function selectedVerkaufsbezeichnungPayload(
  group: AbeVehicleGroup,
): {
  verkaufsbezeichnung: string;
  vehicleTable: TableData;
} {
  return {
    verkaufsbezeichnung: group.verkaufsbezeichnung,
    vehicleTable: vehicleGroupRowsToTableData(group),
  };
}

/** @deprecated Row-level helper kept for legacy documents. */
export function formatAbeVehicleApprovalLine(match: AbeVehicleMatch): string {
  const tireSuffix =
    match.tireSizes.length > 0 ? ` – ${match.tireSizes.join(", ")}` : "";
  const driveSuffix = match.driveType ? ` (${match.driveType})` : "";
  return `${match.verkaufsbezeichnung}${driveSuffix}${tireSuffix}`;
}
