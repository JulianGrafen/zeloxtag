import type { AbeVehicleContext, TableData } from "@/lib/validations/abeSchema";
import type { AbeVehicleMatch } from "@/lib/validations/abeWizardSchemas";
import {
  compactAlnum,
  normalizeMatchToken,
} from "@/services/ocr/TableMatchingService";

export function formatAbeVehicleMatchLabel(match: AbeVehicleMatch): string {
  const parts = [match.model.trim()];
  if (match.driveType?.trim()) parts.push(match.driveType.trim());
  return parts.join(" · ");
}

export function formatAbeVehicleApprovalLine(match: AbeVehicleMatch): string {
  const tireSuffix =
    match.tireSizes.length > 0 ? ` – ${match.tireSizes.join(", ")}` : "";
  const driveSuffix = match.driveType ? ` (${match.driveType})` : "";
  return `${match.model}${driveSuffix}${tireSuffix}`;
}

export function scoreAbeVehicleMatch(
  match: AbeVehicleMatch,
  vehicle: AbeVehicleContext,
): number {
  const haystack = normalizeMatchToken(
    [match.model, match.typeApproval ?? "", match.driveType ?? ""].join(" "),
  );
  const haystackCompact = compactAlnum(
    [match.model, match.typeApproval ?? ""].join(" "),
  );

  const brand = normalizeMatchToken(vehicle.brand);
  const model = normalizeMatchToken(vehicle.model);
  const type = vehicle.type ? normalizeMatchToken(vehicle.type) : "";
  const egBe = vehicle.egBe ? normalizeMatchToken(vehicle.egBe) : "";
  const egBeCompact = vehicle.egBe ? compactAlnum(vehicle.egBe) : "";

  let score = 0;

  if (brand && haystack.includes(brand)) score += 2;

  if (model && haystack.includes(model)) score += 3;

  for (const token of model.split(" ").filter((part) => part.length >= 2)) {
    if (haystack.includes(token)) score += 1;
  }

  if (type) {
    if (
      haystack.includes(type) ||
      haystackCompact.includes(compactAlnum(vehicle.type ?? ""))
    ) {
      score += 4;
    }
  }

  if (egBe && match.typeApproval) {
    const approval = normalizeMatchToken(match.typeApproval);
    if (
      approval.includes(egBe) ||
      haystackCompact.includes(egBeCompact) ||
      compactAlnum(match.typeApproval).includes(egBeCompact)
    ) {
      score += 5;
    }
  }

  return score;
}

/** Pick the best table row for the garage vehicle, if any score is meaningful. */
export function findBestAbeVehicleMatchIndex(
  matches: AbeVehicleMatch[],
  vehicle: AbeVehicleContext | null | undefined,
): number | null {
  if (!vehicle || matches.length === 0) return null;

  let bestIndex: number | null = null;
  let bestScore = 0;

  matches.forEach((match, index) => {
    const score = scoreAbeVehicleMatch(match, vehicle);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestScore >= 3 ? bestIndex : null;
}

export function resolveInitialAbeVehicleMatchIndex(
  matches: AbeVehicleMatch[],
  vehicle: AbeVehicleContext | null | undefined,
): number | null {
  if (matches.length === 0) return null;
  if (matches.length === 1) return 0;
  return findBestAbeVehicleMatchIndex(matches, vehicle);
}

export function auflagenForAbeVehicleMatch(
  match: AbeVehicleMatch | null | undefined,
): string[] {
  if (!match) return [];
  return Array.from(
    new Set(match.auflagenCodes.map((code) => code.trim()).filter(Boolean)),
  );
}

export function selectedVehicleMatchPayload(match: AbeVehicleMatch) {
  return {
    model: match.model,
    driveType: match.driveType,
    typeApproval: match.typeApproval,
    tireSizes: match.tireSizes,
  };
}

export function abeVehicleMatchRowId(index: number): string {
  return `abe-match-${index}`;
}

export function abeVehicleMatchKey(
  match: AbeVehicleMatch,
  index: number,
): string {
  return `${abeVehicleMatchRowId(index)}-${match.model}-${match.driveType ?? ""}-${match.typeApproval ?? ""}`;
}

export function abeVehicleMatchIndexFromRowId(rowId: string): number | null {
  const match = /^abe-match-(\d+)$/.exec(rowId.trim());
  if (!match) return null;
  const index = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(index) ? index : null;
}

/** Render extracted wizard rows as a selectable compatibility-style table. */
export function vehicleMatchesToTableData(
  matches: AbeVehicleMatch[],
  selectedIndex: number | null,
  vehicle: AbeVehicleContext | null | undefined,
): TableData {
  const suggestedIndex = findBestAbeVehicleMatchIndex(matches, vehicle);

  return {
    caption: "Fahrzeugtabelle aus dem Scan",
    headers: ["Modell", "Typgenehmigung", "Antrieb", "Reifen", "Auflagen"],
    rows: matches.map((match, index) => {
      const selected = selectedIndex === index;
      const suggested = suggestedIndex === index;
      const auflagenPreview =
        match.auflagenCodes.length > 0
          ? match.auflagenCodes.slice(0, 10).join(", ") +
            (match.auflagenCodes.length > 10 ? " …" : "")
          : "—";

      return {
        id: abeVehicleMatchRowId(index),
        cells: [
          match.model,
          match.typeApproval?.trim() || "—",
          match.driveType?.trim() || "—",
          match.tireSizes.length > 0 ? match.tireSizes.join(", ") : "—",
          auflagenPreview,
        ],
        isUserVehicleMatch: selected || (!selected && suggested && selectedIndex === null),
        matchReason: selected
          ? "Deine Auswahl"
          : suggested
            ? "Garagen-Vorschlag"
            : null,
      };
    }),
  };
}
