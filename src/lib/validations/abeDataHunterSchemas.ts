import { z } from "zod";

import {
  ABE_MARKING_LLM_INSTRUCTION,
  ABE_MARKING_TEXT_MAX,
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
} from "@/lib/ocr/abe-auflagen-from-text";
import {
  groupAbeVehicleMatches,
  resolveAuflagenCodesForReport,
} from "@/lib/ocr/abe-wizard-vehicle-match";

/** LLM hint: legal ABE holder may appear as Inhaber der ABE or Auftraggeber. */
const ABE_HOLDER_LLM_DESCRIPTION =
  'Legal holder of the ABE: value next to "Inhaber der ABE", "Auftraggeber", or combined "Inhaber der ABE und Hersteller" (then set abeHolder and manufacturer to the same company).';

/** LLM hint: part manufacturer may appear as Hersteller or Herstellerzeichen. */
const ABE_MANUFACTURER_LLM_DESCRIPTION =
  'Part manufacturer / brand: value next to "Hersteller", "Herstellerzeichen", "Marke", or combined holder/manufacturer label (copy to manufacturer too). Short mark codes are valid.';

/** Prefix for OpenAI JSON schema field descriptions (legacy crop steps). */
const FROM_CROP =
  "Extract only from the attached cropped photograph. Copy verbatim. Null or empty if not visible. ";

/** Prefix for freestyle full-page photographs. */
const FROM_PHOTO =
  "Extract only from the attached photograph. Copy verbatim. Null or empty if not visible on this photo. ";

/**
 * Data-hunter steps map 1:1 to required ABE facts:
 * 1 stammdaten → KBA, Nummer der ABE, Inhaber, Hersteller, Bauteilbezeichnung
 * 2 marking    → Kennzeichnung (wo/wie KBA am Bauteil)
 * 3 vehicle    → Verkaufsbezeichnung / Fahrzeugfreigabe
 * 4 auflagen   → Auflagen-Kürzel zum gewählten Fahrzeug
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
  "markingText",
  "verkaufsbezeichnung",
] as const satisfies readonly AbeRequiredFieldKey[];

/** Ghost examples shown inside the camera guide frame while hunting each field. */
export const ABE_HUNT_FIELD_WATERMARKS: Record<AbeRequiredFieldKey, string> = {
  kbaNumber: "KBA 123456",
  abeNumber: "123456*8",
  abeHolder: "Inhaber der ABE\nAuftraggeber\nMuster GmbH",
  manufacturer: "Herstellerzeichen\nAC Schnitzer",
  partDesignation: "Leichtmetallfelge\n8,5 × 19",
  markingText: "Kennzeichnung\nKBA 123456",
  verkaufsbezeichnung: "Fahrzeugmodell\n5ER REIHE",
  auflagenCodes: "A1 · A2 · A3",
  auflagenNotes: "Auflage 744\nText wörtlich…",
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
    scanAction: "Fotografiere den Kennzeichnung-Abschnitt inkl. Tabellenzeilen.",
    popupTitle: "Kennzeichnung",
    popupBody:
      "Fotografiere den kompletten Kennzeichnung-Abschnitt — auch Tabellenzeilen wie „Art der Kennzeichnung“ und „Nummer“.",
  },
  verkaufsbezeichnung: {
    scanAction:
      "Fotografiere die Fahrzeugtabelle — deine Zeile inkl. Auflagen-Spalte, falls sichtbar.",
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

/**
 * Merge a new photo/PDF extraction into the accumulating report.
 * Already-filled scalar fields win; vehicle rows and Auflagen codes accumulate.
 */
export function fillAbeDataHunterReport(
  current: AbeDataHunterReport,
  incoming: AbeDataHunterReport,
): AbeDataHunterReport {
  const rowIndexByKey = new Map(
    current.vehicleMatches.map((row, index) => [vehicleRowKey(row), index]),
  );
  const vehicleMatches = [...current.vehicleMatches];

  for (const row of incoming.vehicleMatches) {
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

  return withInferredKba({
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
    auflagenNotes: mergeAuflagenNotes(current.auflagenNotes, incoming.auflagenNotes),
  });
}

function withInferredKba(report: AbeDataHunterReport): AbeDataHunterReport {
  const kbaNumber = inferAbeKbaFromReport(report);
  if (kbaNumber === report.kbaNumber) return report;
  return { ...report, kbaNumber };
}

export function finalizeAbeDataHunterReport(
  report: AbeDataHunterReport,
): AbeDataHunterReport {
  return withInferredKba(report);
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
): AbeRequiredFieldKey[] {
  const missing: AbeRequiredFieldKey[] = [];
  if (!inferAbeKbaFromReport(report)) missing.push("kbaNumber");
  if (!report.abeNumber?.trim()) missing.push("abeNumber");
  if (!report.abeHolder?.trim()) missing.push("abeHolder");
  if (!report.manufacturer?.trim()) missing.push("manufacturer");
  if (!report.partDesignation?.trim()) missing.push("partDesignation");
  if (!report.markingText?.trim()) missing.push("markingText");

  const verkaufsbezeichnung =
    selectedVerkaufsbezeichnung?.trim() ||
    report.vehicleMatches.find((row) => row.verkaufsbezeichnung?.trim())
      ?.verkaufsbezeichnung;
  if (!verkaufsbezeichnung?.trim() && !isAbeHuntVehicleTableCaptured(report)) {
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
): AbeRequiredFieldKey[] {
  const missing = missingAbeCoreHuntFields(
    report,
    selectedVerkaufsbezeichnung,
    vehicleContext,
  );
  const targetCodes = resolveAuflagenCodesForReport(report, {
    selectedVerkaufsbezeichnung,
    vehicleContext,
  });
  const notesMissing =
    !report.auflagenNotes?.trim() ||
    (targetCodes.length > 0 &&
      missingAuflagenCodesInNotes(report.auflagenNotes, targetCodes).length > 0);
  if (notesMissing) missing.push("auflagenNotes");
  return missing;
}

export function isAbeDataHunterReportComplete(
  report: AbeDataHunterReport,
  selectedVerkaufsbezeichnung?: string | null,
  vehicleContext?: AbeVehicleContext | null,
): boolean {
  return (
    missingAbeRequiredFields(
      report,
      selectedVerkaufsbezeichnung,
      vehicleContext,
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
        description:
          FROM_CROP +
          "Bezeichnung des Bauteils (Gerät, Typ, Design, Spoiler, Spurverbreiterung, Radtyp, etc.).",
      },
    },
  },
} as const;

/** @deprecated Use ABE_HUNT_STAMMDATEN_JSON_SCHEMA */
export const ABE_HUNT_KBA_JSON_SCHEMA = ABE_HUNT_STAMMDATEN_JSON_SCHEMA;

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
                "Verkaufsbezeichnung / model section header for this row group.",
            },
            fahrzeugtyp: {
              type: ["string", "null"],
              description: FROM_CROP + "Fahrzeugtyp cell.",
            },
            typeApproval: {
              type: ["string", "null"],
              description:
                FROM_CROP + "Betriebserlaubnis / Typgenehmigung cell.",
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
                FROM_CROP + "Tyre sizes if present; empty array otherwise.",
            },
            auflagenCodes: {
              type: "array",
              items: { type: "string" },
              description:
                FROM_CROP +
                "Every short Auflagen-Kürzel in this row's Auflagen column — list ALL visible codes (e.g. 744, A02, F40, L04, B04A). Do not omit any.",
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
    required: ["auflagenNotes"],
    properties: {
      auflagenNotes: {
        type: "string",
        description:
          FROM_PHOTO +
          "Transcribe each target Auflagen block as `CODE: full text` (e.g. `744: …`, `F40: …`, `L04: …`). Include EVERY target code listed in the request. Separate blocks with a blank line. Verbatim — no summary.",
      },
    },
  },
} as const;

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
          "Short Auflagen-Kürzel that apply to the selected vehicle row only — never codes from other rows or sections above/below (e.g. 744, A77, 12A).",
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
        description:
          FROM_PHOTO +
          "Bezeichnung des Bauteils (Gerät, Typ, Design, Spoiler, Spurverbreiterung, Radtyp, etc.).",
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
                "Verkaufsbezeichnung / model section header for this row group.",
            },
            fahrzeugtyp: {
              type: ["string", "null"],
              description: FROM_PHOTO + "Fahrzeugtyp cell.",
            },
            typeApproval: {
              type: ["string", "null"],
              description:
                FROM_PHOTO + "Betriebserlaubnis / Typgenehmigung cell.",
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
                FROM_PHOTO + "Tyre sizes if present; empty array otherwise.",
            },
            auflagenCodes: {
              type: "array",
              items: { type: "string" },
              description:
                FROM_PHOTO +
                "Short Auflagen codes from this row's Auflagen column only — never copy codes from other rows above or below.",
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
