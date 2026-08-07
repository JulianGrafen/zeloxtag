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

export function groupAbeVehicleMatches(
  matches: AbeVehicleMatch[],
): AbeVehicleGroup[] {
  const order: string[] = [];
  const byKey = new Map<string, AbeVehicleMatch[]>();

  for (const match of matches) {
    const key = (match.verkaufsbezeichnung ?? "").trim();
    if (!key) continue;
    if (!byKey.has(key)) order.push(key);
    const rows = byKey.get(key) ?? [];
    rows.push(match);
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
  vehicle: AbeVehicleContext | null | undefined,
): number | null {
  if (groups.length === 0) return null;
  if (groups.length === 1) return 0;
  return findBestAbeVehicleGroupIndex(groups, vehicle);
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
