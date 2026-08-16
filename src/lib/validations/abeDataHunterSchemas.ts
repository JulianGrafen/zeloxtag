import { z } from "zod";

import {
  ABE_MARKING_LLM_INSTRUCTION,
  ABE_MARKING_TEXT_MAX,
  extractHerstellerzeichenFromText,
  mergeAbeMarkingText,
} from "@/lib/ocr/abe-marking-from-text";
import {
  ABE_KBA_LLM_DIGITS_ONLY,
  ABE_NUMBER_LLM_DIGITS_ONLY,
  inferAbeKbaFromReport,
  normalizeAbeKbaDigits,
  normalizeAbeNumberDigits,
} from "@/lib/validations/abeSchema";
import { AbeVehicleMatchSchema } from "@/lib/validations/abeWizardSchemas";
import type { AbeVehicleContext } from "@/lib/validations/abeSchema";
import {
  missingAuflagenCodesInNotes,
  requiredAuflagenCodes,
} from "@/lib/ocr/abe-auflagen-from-text";
import {
  auflagenForUserVehicleSelection,
  findBestAbeVehicleGroupIndex,
  findBestAbeVehicleRowIndices,
  groupAbeVehicleMatches,
  resolveAuflagenCodesForReport,
} from "@/lib/ocr/abe-wizard-vehicle-match";
import { ABE_AUFLAGEN_COLUMN_LLM_HINT } from "@/lib/ocr/abe-auflagen-kuerzel-hints";
import { isPlaceholderAbeVerkaufsbezeichnung } from "@/lib/ocr/abe-wizard-vehicle-normalize";

/** LLM hint: legal ABE holder may appear as Inhaber der ABE or Auftraggeber. */
const ABE_HOLDER_LLM_DESCRIPTION =
  'Legal holder of the ABE: value next to "Inhaber der ABE", "Auftraggeber", or combined "Inhaber der ABE und Hersteller" (then set abeHolder and manufacturer to the same company).';

/** LLM hint: part manufacturer / marking brand on the component. */
const ABE_MANUFACTURER_LLM_DESCRIPTION =
  'Part manufacturer / Herstellerzeichen: copy verbatim from "Hersteller" in the Prüfgegenstand block OR from the "Herstellerzeichen" row in Kennzeichnungen / Kennzeichnung (e.g. "PLATIN GERMANY", "AC Schnitzer", "OZ Racing"). Prefer Kennzeichnungen Herstellerzeichen when visible. Also accept "Marke". Do NOT use Auftraggeber/Inhaber unless explicitly labeled as Hersteller.';

/** LLM hint: part designation on Gutachten / ABE pages. */
const ABE_PART_DESIGNATION_LLM_DESCRIPTION =
  'Prüfgegenstand / Bezeichnung des Bauteils: full line including Radgröße and Typ (e.g. "PKW-Sonderrad 8Jx17EH2+ Typ TAM3325-8017", "Sonderräder 8 J x 18 H2 Typ AVAG"). Copy verbatim.';

/** Prefix for OpenAI JSON schema field descriptions (legacy crop steps). */
const FROM_CROP =
  "Extract only from the attached cropped photograph. Copy verbatim. Null or empty if not visible. ";

/** Prefix for freestyle full-page photographs. */
const FROM_PHOTO =
  "Extract only from the attached photograph. Copy verbatim. Null or empty if not visible on this photo. ";

/**
 * Data-hunter steps map 1:1 to required ABE facts:
 * 1 stammdaten → KBA, Nummer der ABE, Inhaber, Hersteller, Bauteilbezeichnung
 * 2 vehicle    → Verkaufsbezeichnung / Fahrzeugfreigabe
 * 3 auflagen   → Auflagen-Kürzel zum gewählten Fahrzeug
 * Kennzeichnung (markingText) is optional — not every ABE documents it.
 */
export const ABE_DATA_HUNTER_STEPS = [
  "stammdaten",
  "marking",
  "vehicle",
  "auflagen",
] as const;

export type AbeDataHunterStep = (typeof ABE_DATA_HUNTER_STEPS)[number];

/** Required core fields that must be present before save. */
export const ABE_REQUIRED_FIELD_LABELS = {
  kbaNumber: "KBA-Nummer",
  abeNumber: "Nummer der ABE",
  abeHolder: "Inhaber der ABE / Auftraggeber",
  manufacturer: "Hersteller / Herstellerzeichen",
  partDesignation: "Bezeichnung des Bauteils",
  markingText: "Kennzeichnung",
  verkaufsbezeichnung: "Verkaufsbezeichnung (Fahrzeugfreigabe)",
  auflagenCodes: "Auflagen-Kürzel (Tabelle)",
  auflagenNotes: "Auflagen (Text)",
} as const;

export type AbeRequiredFieldKey = keyof typeof ABE_REQUIRED_FIELD_LABELS;

/** Fields collected in the first camera hunt (before Auflagen text scan). */
export const ABE_CORE_HUNT_FIELD_KEYS = [
  "kbaNumber",
  "abeNumber",
  "abeHolder",
  "manufacturer",
  "partDesignation",
  "verkaufsbezeichnung",
] as const satisfies readonly AbeRequiredFieldKey[];

export type AbeCoreHuntFieldKey = (typeof ABE_CORE_HUNT_FIELD_KEYS)[number];

/** Optional facts — captured when visible (hunt-all merge) or entered in review. */
export const ABE_OPTIONAL_FIELD_KEYS = ["markingText"] as const satisfies readonly AbeRequiredFieldKey[];

/** Ghost examples shown inside the camera guide frame while hunting each field. */
export const ABE_HUNT_FIELD_WATERMARKS: Record<AbeRequiredFieldKey, string> = {
  kbaNumber: "Gutachten zur ABE Nr.\n48571\n\nKBA-Nummer:\n48571",
  abeNumber: "123456*8",
  abeHolder: "Inhaber der ABE\nAuftraggeber\nMuster GmbH",
  manufacturer: "Herstellerzeichen\nAC Schnitzer",
  partDesignation: "Leichtmetallfelge\n8,5 × 19",
  markingText: "Kennzeichnung\nKBA 123456",
  verkaufsbezeichnung:
    "Fahrzeugtyp | Betriebserlaubnis | kW | Reifen | Auflagen",
  auflagenCodes: "A1 · A2 · A3",
  auflagenNotes: "Auflage\nKürzel",
};

/** User-facing checklist label (differs from internal OCR field names). */
export function abeHuntFieldDisplayLabel(key: AbeRequiredFieldKey): string {
  if (key === "verkaufsbezeichnung") return "Fahrzeugmodell";
  return ABE_REQUIRED_FIELD_LABELS[key];
}

export type AbeHuntFieldScanHint = {
  /** Short line under the checklist title while the field is open. */
  scanAction?: string;
  popupTitle?: string;
  popupBody?: string;
};

/** Optional scan guidance and dismissible popups per hunt step. */
export const ABE_HUNT_FIELD_SCAN_HINTS: Partial<
  Record<AbeRequiredFieldKey, AbeHuntFieldScanHint>
> = {
  kbaNumber: {
    scanAction: "Fotografiere die KBA-Nummer auf der ABE.",
    popupTitle: "KBA-Nummer",
    popupBody:
      "Fotografiere die KBA-Nummer — meist oben auf der ABE neben „KBA“ oder in der Kennzeichnungstabelle.",
  },
  abeNumber: {
    scanAction: "Fotografiere die Nummer der ABE (z. B. 48185*08).",
    popupTitle: "Nummer der ABE",
    popupBody:
      "Fotografiere die ABE-Nummer unter „Nummer der allgemeinen Betriebserlaubnis“.",
  },
  abeHolder: {
    scanAction: "Fotografiere Inhaber der ABE oder Auftraggeber.",
    popupTitle: "Inhaber der ABE",
    popupBody:
      "Fotografiere den Abschnitt „Inhaber der allgemeinen Betriebserlaubnis“ oder „Auftraggeber“.",
  },
  manufacturer: {
    scanAction: "Fotografiere Hersteller oder Herstellerzeichen.",
    popupTitle: "Herstellerzeichen",
    popupBody:
      "Fotografiere „Hersteller“ oder „Herstellerzeichen“ — der Name des Bauteil-Herstellers.",
  },
  partDesignation: {
    scanAction: "Fotografiere die Bezeichnung des Bauteils.",
    popupTitle: "Bezeichnung des Bauteils",
    popupBody:
      "Fotografiere „Bezeichnung des Bauteils“ — z. B. Felge, Spoiler oder Kennzeichenhalter.",
  },
  markingText: {
    scanAction:
      "Optional: Kennzeichnung am Bauteil fotografieren, falls vorhanden.",
    popupTitle: "Kennzeichnung (optional)",
    popupBody:
      "Nicht jede ABE hat einen Kennzeichnung-Abschnitt. Falls vorhanden: Art der Kennzeichnung und Nummer wörtlich fotografieren — sonst überspringen.",
  },
  verkaufsbezeichnung: {
    scanAction:
      "Fotografiere nur den Tabellenausschnitt deines Fahrzeugs — Zeile mit Typ, Betriebserlaubnis, kW, Reifen und Auflagen.",
    popupTitle: "Fahrzeugmodell",
    popupBody:
      "Fotografiere den Tabellenabschnitt mit deinem Fahrzeug (Verkaufsbezeichnung + Zeile). Den Auflagen-Text scannst du im nächsten Schritt separat.",
  },
  auflagenCodes: {
    scanAction:
      "Fotografiere die Auflagen-Spalte in deiner Fahrzeugzeile (z. B. 744, A77).",
    popupTitle: "Auflagen-Kürzel",
    popupBody:
      "Fotografiere die Auflagen-Spalte in deiner Fahrzeugzeile — nur die Kürzel/Nummern. Den vollständigen Auflagen-Text fotografierst du im nächsten Schritt danach.",
  },
  auflagenNotes: {
    scanAction: "Fotografiere den Auflagen-Text zu den angezeigten Nummern.",
    popupTitle: "Auflagen-Text",
    popupBody:
      "Fotografiere die Erklärungen zu den Auflagen-Nummern aus der ABE — Abschnitt „Auflagen“ oder nummerierte Liste. Wörtlich, ohne Kürzen.",
  },
};

// ─── Step extractions ───────────────────────────────────────────────────────────

export const AbeHuntStammdatenSchema = z
  .object({
    kbaNumber: z.string().trim().min(1).max(32).nullable(),
    abeNumber: z.string().trim().min(1).max(80).nullable(),
    abeHolder: z.string().trim().min(1).max(200).nullable(),
    manufacturer: z.string().trim().min(1).max(200).nullable(),
    partDesignation: z.string().trim().min(1).max(200).nullable(),
  })
  .strict();

export type AbeHuntStammdatenExtraction = z.infer<
  typeof AbeHuntStammdatenSchema
>;

/** @deprecated Use AbeHuntStammdatenExtraction */
export type AbeHuntKbaExtraction = AbeHuntStammdatenExtraction;

export const AbeHuntMarkingSchema = z
  .object({
    /** How/where the KBA number is marked on the physical part. */
    markingText: z.string().trim().min(1).max(ABE_MARKING_TEXT_MAX).nullable(),
  })
  .strict();

export type AbeHuntMarkingExtraction = z.infer<typeof AbeHuntMarkingSchema>;

export const AbeHuntVehicleSchema = z
  .object({
    vehicleMatches: z.array(AbeVehicleMatchSchema).max(100),
  })
  .strict();

export type AbeHuntVehicleExtraction = z.infer<typeof AbeHuntVehicleSchema>;

export const AbeHuntAuflagenSchema = z
  .object({
    auflagenCodes: z.array(z.string().trim().min(1).max(40)).max(80),
    auflagenNotes: z.string().trim().min(1).max(8_000).nullable(),
  })
  .strict();

export type AbeHuntAuflagenExtraction = z.infer<typeof AbeHuntAuflagenSchema>;

/** Merged report after all hunt steps (manual overrides applied). */
export const AbeDataHunterReportSchema = z
  .object({
    kbaNumber: z.string().trim().min(1).max(32).nullable(),
    abeNumber: z.string().trim().min(1).max(80).nullable(),
    abeHolder: z.string().trim().min(1).max(200).nullable(),
    manufacturer: z.string().trim().min(1).max(200).nullable(),
    partDesignation: z.string().trim().min(1).max(200).nullable(),
    markingText: z.string().trim().min(1).max(ABE_MARKING_TEXT_MAX).nullable(),
    vehicleMatches: z.array(AbeVehicleMatchSchema).max(100),
    auflagenCodes: z.array(z.string().trim().min(1).max(40)).max(80),
    auflagenNotes: z.string().trim().min(1).max(8_000).nullable(),
  })
  .strict();

export type AbeDataHunterReport = z.infer<typeof AbeDataHunterReportSchema>;

export type AbeHuntExtractionStatus = "ok" | "needs_manual";

export type AbeHuntStepResult<T> = {
  status: AbeHuntExtractionStatus;
  extraction: T;
  reason?: string;
};

// ─── Completeness checks (HITL triggers) ───────────────────────────────────────

export function isAbeHuntStammdatenComplete(
  data: AbeHuntStammdatenExtraction,
): boolean {
  return Boolean(
    data.kbaNumber?.trim() &&
      data.abeNumber?.trim() &&
      data.abeHolder?.trim() &&
      data.manufacturer?.trim() &&
      data.partDesignation?.trim(),
  );
}

/** @deprecated Use isAbeHuntStammdatenComplete */
export const isAbeHuntKbaComplete = isAbeHuntStammdatenComplete;

export function isAbeHuntMarkingComplete(
  data: AbeHuntMarkingExtraction,
): boolean {
  return Boolean(data.markingText?.trim());
}

export function isAbeHuntVehicleComplete(
  data: AbeHuntVehicleExtraction,
): boolean {
  return data.vehicleMatches.some((row) =>
    Boolean(row.verkaufsbezeichnung?.trim()),
  );
}

/** True when OCR captured at least one vehicle table row (even without section header). */
export function isAbeHuntVehicleTableCaptured(
  report: Pick<AbeDataHunterReport, "vehicleMatches">,
): boolean {
  return report.vehicleMatches.some(
    (row) =>
      Boolean(row.verkaufsbezeichnung?.trim()) ||
      Boolean(row.fahrzeugtyp?.trim()) ||
      Boolean(row.typeApproval?.trim()) ||
      Boolean(row.driveType?.trim()) ||
      row.tireSizes.length > 0 ||
      row.auflagenCodes.length > 0,
  );
}

/**
 * Hunt may proceed without a section header when the garage vehicle matches
 * a concrete table row (fahrzeugtyp, EG-BE, Radgrößen, …).
 */
export function isAbeHuntVehicleModelResolved(
  report: Pick<AbeDataHunterReport, "vehicleMatches">,
  vehicleContext?: AbeVehicleContext | null,
): boolean {
  const groups = groupAbeVehicleMatches(report.vehicleMatches);
  if (
    groups.some(
      (group) => !isPlaceholderAbeVerkaufsbezeichnung(group.verkaufsbezeichnung),
    )
  ) {
    return true;
  }

  if (!vehicleContext || groups.length === 0) return false;

  const groupIndex = findBestAbeVehicleGroupIndex(groups, vehicleContext);
  if (groupIndex === null) return false;

  const group = groups[groupIndex];
  if (!group) return false;

  return findBestAbeVehicleRowIndices(group, vehicleContext).length > 0;
}

export function isAbeHuntAuflagenComplete(
  data: AbeHuntAuflagenExtraction,
): boolean {
  return data.auflagenCodes.length > 0;
}

export function mergeAbeDataHunterSteps(
  stammdaten: AbeHuntStammdatenExtraction,
  marking: AbeHuntMarkingExtraction,
  vehicle: AbeHuntVehicleExtraction,
  auflagen: AbeHuntAuflagenExtraction,
): AbeDataHunterReport {
  return {
    kbaNumber: stammdaten.kbaNumber,
    abeNumber: stammdaten.abeNumber,
    abeHolder: stammdaten.abeHolder,
    manufacturer: stammdaten.manufacturer,
    partDesignation: stammdaten.partDesignation,
    markingText: marking.markingText,
    vehicleMatches: vehicle.vehicleMatches,
    auflagenCodes: auflagen.auflagenCodes,
    auflagenNotes: auflagen.auflagenNotes,
  };
}

function keepFilled(
  current: string | null | undefined,
  incoming: string | null | undefined,
): string | null {
  const cur = current?.trim();
  if (cur) return cur;
  const next = incoming?.trim();
  return next || null;
}

function mergeUniqueCodes(a: string[], b: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const code of [...a, ...b]) {
    const trimmed = code.trim();
    if (!trimmed) continue;
    const key = trimmed.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function vehicleRowKey(row: {
  verkaufsbezeichnung: string;
  fahrzeugtyp: string | null;
  typeApproval: string | null;
}): string {
  return [
    row.verkaufsbezeichnung.trim().toUpperCase(),
    (row.fahrzeugtyp ?? "").trim().toUpperCase(),
    (row.typeApproval ?? "").trim().toUpperCase(),
  ].join("|");
}

function mergeVehicleMatchRow(
  current: AbeDataHunterReport["vehicleMatches"][number],
  incoming: AbeDataHunterReport["vehicleMatches"][number],
): AbeDataHunterReport["vehicleMatches"][number] {
  return {
    verkaufsbezeichnung:
      current.verkaufsbezeichnung.trim() ||
      incoming.verkaufsbezeichnung.trim() ||
      current.verkaufsbezeichnung,
    fahrzeugtyp: current.fahrzeugtyp ?? incoming.fahrzeugtyp,
    typeApproval: current.typeApproval ?? incoming.typeApproval,
    driveType: current.driveType ?? incoming.driveType,
    tireSizes: mergeUniqueCodes(current.tireSizes, incoming.tireSizes),
    auflagenCodes: mergeUniqueCodes(
      current.auflagenCodes,
      incoming.auflagenCodes,
    ),
  };
}

function isVehicleTableOnlyIncoming(incoming: AbeDataHunterReport): boolean {
  return (
    incoming.vehicleMatches.length > 0 &&
    !incoming.kbaNumber?.trim() &&
    !incoming.abeNumber?.trim() &&
    !incoming.abeHolder?.trim() &&
    !incoming.manufacturer?.trim() &&
    !incoming.partDesignation?.trim() &&
    !incoming.markingText?.trim() &&
    incoming.auflagenCodes.length === 0 &&
    !incoming.auflagenNotes?.trim()
  );
}

function mergeIncomingVehicleMatches(
  current: AbeDataHunterReport["vehicleMatches"],
  incoming: AbeDataHunterReport["vehicleMatches"],
): AbeDataHunterReport["vehicleMatches"] {
  const rowIndexByKey = new Map(
    current.map((row, index) => [vehicleRowKey(row), index]),
  );
  const vehicleMatches = [...current];

  for (const row of incoming) {
    const key = vehicleRowKey(row);
    const existingIndex = rowIndexByKey.get(key);
    if (existingIndex !== undefined) {
      vehicleMatches[existingIndex] = mergeVehicleMatchRow(
        vehicleMatches[existingIndex]!,
        row,
      );
      continue;
    }
    rowIndexByKey.set(key, vehicleMatches.length);
    vehicleMatches.push(row);
  }

  return vehicleMatches;
}

/**
 * Merge a new photo/PDF extraction into the accumulating report.
 * Already-filled scalar fields win. A dedicated table scan replaces vehicle
 * rows so a previous hallucinated model does not stay in the picker.
 */
export function fillAbeDataHunterReport(
  current: AbeDataHunterReport,
  incoming: AbeDataHunterReport,
): AbeDataHunterReport {
  const vehicleMatches = isVehicleTableOnlyIncoming(incoming)
    ? [...incoming.vehicleMatches]
    : mergeIncomingVehicleMatches(current.vehicleMatches, incoming.vehicleMatches);

  return coalesceAbeHolderAndManufacturer(
    withInferredKba({
      kbaNumber: keepFilled(
        current.kbaNumber,
        normalizeAbeKbaDigits(incoming.kbaNumber),
      ),
      abeNumber: keepFilled(
        current.abeNumber,
        normalizeAbeNumberDigits(incoming.abeNumber),
      ),
      abeHolder: keepFilled(current.abeHolder, incoming.abeHolder),
      manufacturer: keepFilled(current.manufacturer, incoming.manufacturer),
      partDesignation: keepFilled(
        current.partDesignation,
        incoming.partDesignation,
      ),
      markingText: mergeAbeMarkingText(
        current.markingText,
        incoming.markingText,
      ),
      vehicleMatches,
      auflagenCodes:
        vehicleMatches.length > 0
          ? current.auflagenCodes
          : mergeUniqueCodes(current.auflagenCodes, incoming.auflagenCodes),
      auflagenNotes: mergeAuflagenNotes(
        current.auflagenNotes,
        incoming.auflagenNotes,
      ),
    }),
  );
}

function withInferredKba(report: AbeDataHunterReport): AbeDataHunterReport {
  const kbaNumber = inferAbeKbaFromReport(report);
  if (kbaNumber === report.kbaNumber) return report;
  return { ...report, kbaNumber };
}

/** Mirror holder ↔ manufacturer when ABE labels them as one company. */
export function sanitizeAbePartyName(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed
    .replace(/\bHandelgesellschaft\b/gi, "Handelsgesellschaft")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function coalesceAbeHolderAndManufacturer(
  report: AbeDataHunterReport,
): AbeDataHunterReport {
  const holder = sanitizeAbePartyName(report.abeHolder);
  const manufacturerFromMarking = extractHerstellerzeichenFromText(
    report.markingText,
  );
  const manufacturer =
    sanitizeAbePartyName(report.manufacturer) ?? manufacturerFromMarking;
  if (holder && !manufacturer) {
    return { ...report, abeHolder: holder, manufacturer: holder };
  }
  if (manufacturer && !holder) {
    return { ...report, abeHolder: manufacturer, manufacturer };
  }
  if (holder || manufacturer) {
    return {
      ...report,
      abeHolder: holder,
      manufacturer: manufacturer,
    };
  }
  return report;
}

export function finalizeAbeDataHunterReport(
  report: AbeDataHunterReport,
): AbeDataHunterReport {
  return coalesceAbeHolderAndManufacturer(withInferredKba(report));
}

export function scopeAbeDataHunterReportAuflagen(
  report: AbeDataHunterReport,
  selectedVerkaufsbezeichnung?: string | null,
  vehicleContext?: AbeVehicleContext | null,
): AbeDataHunterReport {
  const scoped = resolveAuflagenCodesForReport(report, {
    selectedVerkaufsbezeichnung,
    vehicleContext,
  });
  if (scoped.join("|") === report.auflagenCodes.join("|")) {
    return report;
  }
  return { ...report, auflagenCodes: scoped };
}

export function emptyAbeDataHunterReport(): AbeDataHunterReport {
  return {
    kbaNumber: null,
    abeNumber: null,
    abeHolder: null,
    manufacturer: null,
    partDesignation: null,
    markingText: null,
    vehicleMatches: [],
    auflagenCodes: [],
    auflagenNotes: null,
  };
}

function mergeAuflagenNotes(
  current: string | null | undefined,
  incoming: string | null | undefined,
): string | null {
  const next = incoming?.trim();
  if (!next) return current?.trim() || null;
  const prev = current?.trim();
  if (!prev) return next;
  if (prev.includes(next)) return prev;
  return `${prev}\n\n${next}`;
}

export function missingAbeCoreHuntFields(
  report: AbeDataHunterReport,
  selectedVerkaufsbezeichnung?: string | null,
  vehicleContext?: AbeVehicleContext | null,
): AbeCoreHuntFieldKey[] {
  const missing: AbeCoreHuntFieldKey[] = [];
  if (!inferAbeKbaFromReport(report)) missing.push("kbaNumber");
  if (!report.abeNumber?.trim()) missing.push("abeNumber");
  if (!report.abeHolder?.trim()) missing.push("abeHolder");
  if (!report.manufacturer?.trim()) missing.push("manufacturer");
  if (!report.partDesignation?.trim()) missing.push("partDesignation");

  const rowVerkaufsbezeichnung = report.vehicleMatches.find((row) =>
    Boolean(row.verkaufsbezeichnung?.trim()),
  )?.verkaufsbezeichnung;
  const verkaufsbezeichnung = [
    selectedVerkaufsbezeichnung,
    rowVerkaufsbezeichnung,
  ]
    .map((value) => value?.trim())
    .find(
      (value) => value && !isPlaceholderAbeVerkaufsbezeichnung(value),
    );
  if (
    !verkaufsbezeichnung &&
    !isAbeHuntVehicleModelResolved(report, vehicleContext)
  ) {
    missing.push("verkaufsbezeichnung");
  }

  return missing;
}

export function isAbeCoreHuntComplete(
  report: AbeDataHunterReport,
  selectedVerkaufsbezeichnung?: string | null,
  vehicleContext?: AbeVehicleContext | null,
): boolean {
  return (
    missingAbeCoreHuntFields(
      report,
      selectedVerkaufsbezeichnung,
      vehicleContext,
    ).length === 0
  );
}

/**
 * Returns human-readable labels of required fields that are still missing.
 * `verkaufsbezeichnung` is checked via the selected group / first match.
 */
export function missingAbeRequiredFields(
  report: AbeDataHunterReport,
  selectedVerkaufsbezeichnung?: string | null,
  vehicleContext?: AbeVehicleContext | null,
  selection?: {
    selectedGroupIndex?: number | null;
    selectedRowId?: string | null;
    /** User skipped Auflagen text scan — allow save without auflagenNotes. */
    auflagenScanSkipped?: boolean;
    /** Individual Kürzel the user could not find on paper — not required in notes. */
    skippedAuflagenCodes?: readonly string[];
  },
): AbeRequiredFieldKey[] {
  const missing: AbeRequiredFieldKey[] = [
    ...missingAbeCoreHuntFields(
      report,
      selectedVerkaufsbezeichnung,
      vehicleContext,
    ),
  ];
  if (selection?.auflagenScanSkipped) {
    return missing;
  }
  const groups = groupAbeVehicleMatches(report.vehicleMatches);
  const targetCodes =
    groups.length > 0
      ? auflagenForUserVehicleSelection(
          report,
          selection?.selectedGroupIndex ?? null,
          selection?.selectedRowId ?? null,
          vehicleContext,
        )
      : resolveAuflagenCodesForReport(report, {
          selectedVerkaufsbezeichnung,
          vehicleContext,
        });
  const skippedCodes = selection?.skippedAuflagenCodes ?? [];
  const codesStillRequired = requiredAuflagenCodes(targetCodes, skippedCodes);
  if (codesStillRequired.length === 0) {
    return missing;
  }
  const codesStillMissing = missingAuflagenCodesInNotes(
    report.auflagenNotes,
    targetCodes,
    skippedCodes,
  );
  if (
    !report.auflagenNotes?.trim() ||
    codesStillMissing.length > 0
  ) {
    missing.push("auflagenNotes");
  }
  return missing;
}

export function isAbeDataHunterReportComplete(
  report: AbeDataHunterReport,
  selectedVerkaufsbezeichnung?: string | null,
  vehicleContext?: AbeVehicleContext | null,
  selection?: {
    selectedGroupIndex?: number | null;
    selectedRowId?: string | null;
    auflagenScanSkipped?: boolean;
    skippedAuflagenCodes?: readonly string[];
  },
): boolean {
  return (
    missingAbeRequiredFields(
      report,
      selectedVerkaufsbezeichnung,
      vehicleContext,
      selection,
    ).length === 0
  );
}

// ─── OpenAI JSON Schemas ───────────────────────────────────────────────────────

export const ABE_HUNT_STAMMDATEN_JSON_SCHEMA = {
  name: "abe_hunt_stammdaten",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "kbaNumber",
      "abeNumber",
      "abeHolder",
      "manufacturer",
      "partDesignation",
    ],
    properties: {
      kbaNumber: {
        type: ["string", "null"],
        description: FROM_CROP + ABE_KBA_LLM_DIGITS_ONLY,
      },
      abeNumber: {
        type: ["string", "null"],
        description: FROM_CROP + ABE_NUMBER_LLM_DIGITS_ONLY,
      },
      abeHolder: {
        type: ["string", "null"],
        description: FROM_CROP + ABE_HOLDER_LLM_DESCRIPTION,
      },
      manufacturer: {
        type: ["string", "null"],
        description: FROM_CROP + ABE_MANUFACTURER_LLM_DESCRIPTION,
      },
      partDesignation: {
        type: ["string", "null"],
        description: FROM_CROP + ABE_PART_DESIGNATION_LLM_DESCRIPTION,
      },
    },
  },
} as const;

/** @deprecated Use ABE_HUNT_STAMMDATEN_JSON_SCHEMA */
export const ABE_HUNT_KBA_JSON_SCHEMA = ABE_HUNT_STAMMDATEN_JSON_SCHEMA;

/** KBA-only extraction for the dedicated first wizard step. */
export const ABE_HUNT_KBA_ONLY_JSON_SCHEMA = {
  name: "abe_hunt_kba_only",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["kbaNumber", "abeNumber"],
    properties: {
      kbaNumber: {
        type: ["string", "null"],
        description:
          FROM_PHOTO +
          'KBA approval digits only (e.g. "48571"). From "KBA-Nummer", "KBA Nummer", Kennzeichnungen block, or "Gutachten zur ABE Nr." — never Gutachten-Nr. with letters.',
      },
      abeNumber: {
        type: ["string", "null"],
        description:
          FROM_PHOTO +
          'Optional "Nummer der ABE" with optional * suffix (e.g. 48571*08). Same leading digits as kbaNumber on Gutachten documents.',
      },
    },
  },
} as const;

export const ABE_HUNT_MARKING_JSON_SCHEMA = {
  name: "abe_hunt_marking",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["markingText", "markingType", "markingNumber"],
    properties: {
      markingText: {
        type: ["string", "null"],
        description: FROM_CROP + ABE_MARKING_LLM_INSTRUCTION,
      },
      markingType: {
        type: ["string", "null"],
        description:
          FROM_CROP +
          'Art der Kennzeichnung verbatim (e.g. "Prüfplakette", "Eingegossen"). Null if not visible.',
      },
      markingNumber: {
        type: ["string", "null"],
        description:
          FROM_CROP +
          'Kennzeichnungsnummer / Nummer verbatim (e.g. "e1*47656"). Null if not visible.',
      },
    },
  },
} as const;

export const ABE_HUNT_VEHICLE_JSON_SCHEMA = {
  name: "abe_hunt_vehicle",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["vehicleMatches"],
    properties: {
      vehicleMatches: {
        type: "array",
        description:
          FROM_CROP +
          "One entry per visible table row for the Verkaufsbezeichnung / vehicle approval section.",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "verkaufsbezeichnung",
            "fahrzeugtyp",
            "typeApproval",
            "driveType",
            "tireSizes",
            "auflagenCodes",
          ],
          properties: {
            verkaufsbezeichnung: {
              type: "string",
              description:
                FROM_CROP +
                "Verkaufsbezeichnung / Handelsbezeichnung HEADER printed ABOVE the table — repeat on every row in the same vehicle block. Copy verbatim. Empty if unreadable. Never a Fahrzeugtyp code from the first column. Never invent a model.",
            },
            fahrzeugtyp: {
              type: ["string", "null"],
              description:
                FROM_CROP +
                "FIRST data column: the printed Fahrzeugtyp / type code only. Required when visible. Never invent a code. Never the model header, never EG-BE, never kW.",
            },
            typeApproval: {
              type: ["string", "null"],
              description:
                FROM_CROP +
                "SECOND data column: Betriebserlaubnis / Typgenehmigung / EG-BE / technische Bezeichnung cell verbatim (e1*…). Never a Fahrzeugtyp code.",
            },
            driveType: {
              type: ["string", "null"],
              description:
                FROM_CROP +
                "Allradantrieb / Heckantrieb / Frontantrieb if present.",
            },
            tireSizes: {
              type: "array",
              items: { type: "string" },
              description:
                FROM_CROP +
                'Reifen / Radgröße column (e.g. "225/40 R18", "245/35 ZR19") — one string per size; empty array when column missing.',
            },
            auflagenCodes: {
              type: "array",
              items: { type: "string" },
              description:
                FROM_CROP +
                ABE_AUFLAGEN_COLUMN_LLM_HINT +
                " Examples: 11A, 12A, 20B, 22B, 51A, 744, A01, A02, F40, L04, B04A.",
            },
          },
        },
      },
    },
  },
} as const;

export const ABE_HUNT_AUFLAGEN_TEXT_JSON_SCHEMA = {
  name: "abe_hunt_auflagen_text",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["auflagenNotes", "regions"],
    properties: {
      auflagenNotes: {
        type: "string",
        description:
          FROM_PHOTO +
          "Transcribe each target Auflagen block as `CODE: full text` (e.g. `744: …`, `F40: …`, `L04: …`). Include EVERY target code listed in the request. Separate blocks with a blank line. Verbatim — no summary.",
      },
      regions: {
        type: "array",
        description:
          FROM_PHOTO +
          "Normalized bounding box (0–1) for each target code block on the photo. top/left/bottom/right relative to full image.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["code", "top", "left", "bottom", "right"],
          properties: {
            code: { type: "string" },
            top: { type: "number" },
            left: { type: "number" },
            bottom: { type: "number" },
            right: { type: "number" },
          },
        },
      },
    },
  },
} as const;

export type AbeHuntAuflagenTextExtraction = {
  auflagenNotes: string | null;
  regions: Array<{
    code: string;
    top: number;
    left: number;
    bottom: number;
    right: number;
  }>;
};

export const ABE_HUNT_AUFLAGEN_JSON_SCHEMA = {
  name: "abe_hunt_auflagen",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["auflagenCodes", "auflagenNotes"],
    properties: {
      auflagenCodes: {
        type: "array",
        items: { type: "string" },
        description:
          FROM_CROP +
          ABE_AUFLAGEN_COLUMN_LLM_HINT +
          " Apply to the selected vehicle row only — never codes from other rows (e.g. 744, A77, 12A, 22B).",
      },
      auflagenNotes: {
        type: ["string", "null"],
        description:
          FROM_CROP +
          "Optional free-text notes next to the codes. Null if none.",
      },
    },
  },
} as const;

/**
 * Single-shot freestyle extraction: pull every visible required ABE fact
 * from one full photograph (no crop steps).
 */
export const ABE_HUNT_ALL_JSON_SCHEMA = {
  name: "abe_hunt_all",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "kbaNumber",
      "abeNumber",
      "abeHolder",
      "manufacturer",
      "partDesignation",
      "markingText",
      "markingType",
      "markingNumber",
      "vehicleMatches",
      "auflagenCodes",
      "auflagenNotes",
    ],
    properties: {
      kbaNumber: {
        type: ["string", "null"],
        description: FROM_PHOTO + ABE_KBA_LLM_DIGITS_ONLY,
      },
      abeNumber: {
        type: ["string", "null"],
        description: FROM_PHOTO + ABE_NUMBER_LLM_DIGITS_ONLY,
      },
      abeHolder: {
        type: ["string", "null"],
        description: FROM_PHOTO + ABE_HOLDER_LLM_DESCRIPTION,
      },
      manufacturer: {
        type: ["string", "null"],
        description: FROM_PHOTO + ABE_MANUFACTURER_LLM_DESCRIPTION,
      },
      partDesignation: {
        type: ["string", "null"],
        description: FROM_PHOTO + ABE_PART_DESIGNATION_LLM_DESCRIPTION,
      },
      markingText: {
        type: ["string", "null"],
        description: FROM_PHOTO + ABE_MARKING_LLM_INSTRUCTION,
      },
      markingType: {
        type: ["string", "null"],
        description:
          FROM_PHOTO +
          'Art der Kennzeichnung verbatim (e.g. "Prüfplakette", "Eingegossen"). Null if not visible.',
      },
      markingNumber: {
        type: ["string", "null"],
        description:
          FROM_PHOTO +
          'Kennzeichnungsnummer / Nummer verbatim (e.g. "e1*47656"). Null if not visible.',
      },
      vehicleMatches: {
        type: "array",
        description:
          FROM_PHOTO +
          "One entry per visible table row for the Verkaufsbezeichnung / vehicle approval section. Empty if no table is visible.",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "verkaufsbezeichnung",
            "fahrzeugtyp",
            "typeApproval",
            "driveType",
            "tireSizes",
            "auflagenCodes",
          ],
          properties: {
            verkaufsbezeichnung: {
              type: "string",
              description:
                FROM_PHOTO +
                "Verkaufsbezeichnung / Handelsbezeichnung HEADER printed ABOVE the table — NOT the first-column Fahrzeugtyp code. Copy verbatim. Never invent a model.",
            },
            fahrzeugtyp: {
              type: ["string", "null"],
              description:
                FROM_PHOTO +
                "FIRST data column: the printed Fahrzeugtyp / type code only. Required when visible. Never invent a code. Never the model header, never EG-BE.",
            },
            typeApproval: {
              type: ["string", "null"],
              description:
                FROM_PHOTO +
                "Betriebserlaubnis / Typgenehmigung / EG-BE cell verbatim (e1*…). Never a Fahrzeugtyp code.",
            },
            driveType: {
              type: ["string", "null"],
              description:
                FROM_PHOTO +
                "Allradantrieb / Heckantrieb / Frontantrieb if present.",
            },
            tireSizes: {
              type: "array",
              items: { type: "string" },
              description:
                FROM_PHOTO +
                'Reifen / Radgröße column (e.g. "225/40 R18", "245/35 ZR19") — one string per size; empty array when column missing.',
            },
            auflagenCodes: {
              type: "array",
              items: { type: "string" },
              description:
                FROM_PHOTO +
                ABE_AUFLAGEN_COLUMN_LLM_HINT +
                " Never copy codes from other rows above or below.",
            },
          },
        },
      },
      auflagenCodes: {
        type: "array",
        items: { type: "string" },
        description:
          FROM_PHOTO +
          "Leave empty — Auflagen text is captured in a separate scan step. Put table Kürzel only in vehicleMatches[].auflagenCodes.",
      },
      auflagenNotes: {
        type: ["string", "null"],
        description:
          FROM_PHOTO +
          "Optional free-text notes next to the codes. Null if none.",
      },
    },
  },
} as const;
