import type OpenAI from "openai";

import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import {
  buildAbeVisionUserMessage,
  ABE_HUNT_MAX_PDF_PAGES,
  LLM_IMAGE_MAX_EDGE_PX,
  LLM_INVOICE_MAX_PDF_PAGES,
  type PrepareDocumentForLlmOptions,
} from "@/lib/ocr/prepare-document-for-llm";
import { isPdfBuffer, resolveDocumentContentType } from "@/lib/ocr/document-bytes";
import {
  extractMarkdownFromAzureLayout,
  isAzureMarkdownLayoutAvailable,
} from "@/lib/ocr/azure-markdown-layout";
import {
  type DocumentBytesInput,
} from "@/lib/ocr/llm-document-content";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";
import { TextParseError } from "@/lib/ocr/parse-error";
import { parseAbeVehicleRows, mergeAbeVehicleMatchRows } from "@/lib/ocr/abe-wizard-vehicle-normalize";
import { resolveAbeMarkingText } from "@/lib/ocr/abe-marking-from-text";
import {
  normalizeAbeKbaDigits,
  normalizeAbeNumberDigits,
  inferAbeKbaFromReport,
} from "@/lib/validations/abeSchema";
import {
  parseAuflagenRegions,
} from "@/lib/ocr/auflagen-crop";
import {
  attributeAuflagenScanNotes,
  sanitizeAuflagenNotesForTargetCodes,
} from "@/lib/ocr/abe-auflagen-from-text";
import { correctAuflagenKuerzelOcr } from "@/lib/ocr/auflagen-kuerzel-ocr-correction";
import {
  ABE_HUNT_ALL_JSON_SCHEMA,
  ABE_HUNT_AUFLAGEN_JSON_SCHEMA,
  ABE_HUNT_AUFLAGEN_TEXT_JSON_SCHEMA,
  ABE_HUNT_KBA_ONLY_JSON_SCHEMA,
  ABE_HUNT_MARKING_JSON_SCHEMA,
  ABE_HUNT_STAMMDATEN_JSON_SCHEMA,
  ABE_HUNT_VEHICLE_JSON_SCHEMA,
  AbeDataHunterReportSchema,
  AbeHuntAuflagenSchema,
  AbeHuntMarkingSchema,
  AbeHuntStammdatenSchema,
  emptyAbeDataHunterReport,
  finalizeAbeDataHunterReport,
  type AbeHuntAuflagenTextExtraction,
  coalesceAbeHolderAndManufacturer,
  isAbeHuntAuflagenComplete,
  isAbeHuntMarkingComplete,
  isAbeHuntStammdatenComplete,
  isAbeHuntVehicleComplete,
  type AbeDataHunterReport,
  type AbeHuntAuflagenExtraction,
  type AbeHuntMarkingExtraction,
  type AbeHuntStammdatenExtraction,
  type AbeHuntStepResult,
  type AbeHuntVehicleExtraction,
} from "@/lib/validations/abeDataHunterSchemas";
import {
  resolveAbeContextModel,
  resolveAbeTableExtractionModel,
} from "@/services/ocr/AbeExtractionService";

const IMAGE_ONLY_GUARD =
  "CRITICAL: Read ONLY the attached cropped photograph. " +
  "Extract only the requested data points. Never invent values. " +
  "If a requested field is not visible, use null or an empty array.";

const FREESTYLE_GUARD =
  "CRITICAL: Read ONLY the attached photograph of an ABE / Gutachten page. " +
  "Extract every requested field that is clearly visible. Never invent values. " +
  "If a field is not on this photo, use null or an empty array. Partial results are expected.";

type JsonSchema =
  | typeof ABE_HUNT_STAMMDATEN_JSON_SCHEMA
  | typeof ABE_HUNT_KBA_ONLY_JSON_SCHEMA
  | typeof ABE_HUNT_MARKING_JSON_SCHEMA
  | typeof ABE_HUNT_VEHICLE_JSON_SCHEMA
  | typeof ABE_HUNT_AUFLAGEN_JSON_SCHEMA
  | typeof ABE_HUNT_AUFLAGEN_TEXT_JSON_SCHEMA
  | typeof ABE_HUNT_ALL_JSON_SCHEMA;

const EMPTY_STAMMDATEN: AbeHuntStammdatenExtraction = {
  kbaNumber: null,
  abeNumber: null,
  abeHolder: null,
  manufacturer: null,
  partDesignation: null,
};

/**
 * Data-hunter ABE extraction — processes tightly cropped image snippets.
 * Validation / completeness failures return `needs_manual` (HITL), never throw to client.
 */
export class AbeDataHunterExtractionService {
  async extractStammdatenSnippet(
    input: DocumentBytesInput,
  ): Promise<AbeHuntStepResult<AbeHuntStammdatenExtraction>> {
    try {
      const raw = await this.runSnippetStep(
        input,
        [
          IMAGE_ONLY_GUARD,
          "Extract ABE master data: kbaNumber (digits only), abeNumber (Nummer der ABE, digits only), abeHolder (Inhaber der ABE / Auftraggeber), manufacturer (Hersteller / Herstellerzeichen from Prüfgegenstand or Kennzeichnungen table), partDesignation (Prüfgegenstand / Bezeichnung des Bauteils).",
          "Never put Gutachten-Nr. or Genehmigungsnummer with letters into kbaNumber or abeNumber.",
          "If 'Inhaber der ABE und Hersteller' is combined, set both abeHolder and manufacturer to that value.",
          'Map "Auftraggeber" to abeHolder when no separate Inhaber der ABE label is shown.',
        ],
        [
          "Extract only the requested data points from this cropped image.",
          "Look for KBA, Nummer der ABE, Gutachten zur ABE Nr., Inhaber der ABE, Auftraggeber, Prüfgegenstand, Hersteller, and Radgröße / Typ.",
        ],
        ABE_HUNT_STAMMDATEN_JSON_SCHEMA,
        "hunt-stammdaten",
        600,
      );

      const parsed = AbeHuntStammdatenSchema.safeParse(raw);
      if (!parsed.success) {
        return {
          status: "needs_manual",
          extraction: EMPTY_STAMMDATEN,
          reason:
            "Stammdaten unvollständig — bitte KBA, ABE-Nummer, Inhaber, Hersteller und Bauteilbezeichnung manuell eintragen.",
        };
      }

      const extraction: AbeHuntStammdatenExtraction = {
        ...parsed.data,
        kbaNumber: normalizeAbeKbaDigits(parsed.data.kbaNumber) || null,
        abeNumber: normalizeAbeNumberDigits(parsed.data.abeNumber) || null,
      };

      const coalesced = coalesceAbeHolderAndManufacturer({
        ...emptyAbeDataHunterReport(),
        ...extraction,
      });

      if (!isAbeHuntStammdatenComplete(coalesced)) {
        return {
          status: "needs_manual",
          extraction: {
            kbaNumber: coalesced.kbaNumber,
            abeNumber: coalesced.abeNumber,
            abeHolder: coalesced.abeHolder,
            manufacturer: coalesced.manufacturer,
            partDesignation: coalesced.partDesignation,
          },
          reason:
            "Nicht alle Stammdaten erkannt — fehlende Pflichtfelder bitte manuell ergänzen.",
        };
      }

      return {
        status: "ok",
        extraction: {
          kbaNumber: coalesced.kbaNumber,
          abeNumber: coalesced.abeNumber,
          abeHolder: coalesced.abeHolder,
          manufacturer: coalesced.manufacturer,
          partDesignation: coalesced.partDesignation,
        },
      };
    } catch {
      return {
        status: "needs_manual",
        extraction: EMPTY_STAMMDATEN,
        reason:
          "Stammdaten konnten nicht gelesen werden — bitte manuell eintragen.",
      };
    }
  }

  async extractMarkingSnippet(
    input: DocumentBytesInput,
  ): Promise<AbeHuntStepResult<AbeHuntMarkingExtraction>> {
    const empty: AbeHuntMarkingExtraction = { markingText: null };

    try {
      const raw = await this.runSnippetStep(
        input,
        [
          IMAGE_ONLY_GUARD,
          'Transcribe the Kennzeichnung section verbatim after the "Kennzeichnung" heading.',
          "Include every line and table row (Art der Kennzeichnung, Nummer, etc.) as Label: Value lines.",
          "Never summarize or paraphrase.",
        ],
        [
          "Extract only the Kennzeichnung block from this image.",
          "Copy the exact text behind the Kennzeichnung heading, including any table.",
        ],
        ABE_HUNT_MARKING_JSON_SCHEMA,
        "hunt-marking",
        1_500,
      );

      const parsed = AbeHuntMarkingSchema.safeParse({
        markingText: resolveAbeMarkingText(
          typeof raw === "object" && raw ? (raw as Record<string, unknown>) : {},
        ),
      });
      if (!parsed.success) {
        return {
          status: "needs_manual",
          extraction: empty,
          reason:
            "Kennzeichnung nicht erkannt — bitte beschreiben, wo/wie die KBA-Nummer am Bauteil zu finden ist.",
        };
      }

      if (!isAbeHuntMarkingComplete(parsed.data)) {
        return {
          status: "needs_manual",
          extraction: parsed.data,
          reason:
            "Kennzeichnung fehlt — bitte wo/wie die KBA-Nummer am Bauteil zu finden ist manuell eintragen.",
        };
      }

      return { status: "ok", extraction: parsed.data };
    } catch {
      return {
        status: "needs_manual",
        extraction: empty,
        reason:
          "Kennzeichnung konnte nicht gelesen werden — bitte manuell eintragen.",
      };
    }
  }

  async extractVehicleSnippet(
    input: DocumentBytesInput,
  ): Promise<AbeHuntStepResult<AbeHuntVehicleExtraction>> {
    const empty: AbeHuntVehicleExtraction = { vehicleMatches: [] };

    try {
      const extractRows = async (isRetry: boolean) => {
        const raw = await this.runSnippetStep(
          input,
          [
            IMAGE_ONLY_GUARD,
            "Extract German ABE / Gutachten Verwendungsbereich table rows (allowed vehicles).",
            "Copy ONLY text that is readable on this photograph. Never invent a model, type code, or EG-BE. Never reuse sample vehicles from these instructions.",
            "Cropped photos usually show 5 columns: Fahrzeugtyp | Betriebserlaubnis / EG-BE | kW | Reifen | Auflagen.",
            "Verkaufsbezeichnung / Handelsbezeichnung is the vehicle model HEADER ABOVE the table — not a table column, not the manufacturer word alone, not a Fahrzeugtyp code.",
            "Copy that printed header onto every row of that vehicle block. If no header is readable, use an empty string — do not guess a model name.",
            "Column mapping for the cropped 5-col table:",
            "- fahrzeugtyp: FIRST data column — the printed type code only. Required when the cell is visible. Never leave null if a type code is readable. Never invent a code.",
            "- typeApproval: SECOND column — Betriebserlaubnis / EG-BE / ABE/EWG-Nr verbatim. Never put type codes here.",
            "- kW ranges are NOT fahrzeugtyp and NOT typeApproval — ignore that column.",
            "- driveType: Allradantrieb / Heckantrieb / Frontantrieb if present, else null.",
            "- tireSizes: Reifen column — ALL printed sizes for this row; one entry per size; never omit a size from the cell; empty array when column missing.",
            "- auflagenCodes: ALL short codes from reifenbezogene Auflagen AND Auflagen und Hinweise columns for this row. Letter suffixes stay letters. Do not omit any visible Kürzel.",
            "Read digits 3 and 8 carefully in Fahrzeugtyp codes — they are often confused.",
            "When one table line lists multiple Fahrzeugtyp codes separated by comma, emit ONE vehicleMatches row PER printed code with the same header and EG-BE.",
            "Do not merge rows. Do not skip visible rows. Extract every vehicle block visible on the photo.",
            ...(isRetry
              ? [
                  "The table shows MULTIPLE Fahrzeugtyp rows under the same Handelsbezeichnung — return EVERY visible row, not just the first.",
                  "Each printed type-code line is a separate row. Do not invent extra models.",
                ]
              : []),
          ],
          [
            "Extract every visible Verwendungsbereich row.",
            "Typical cropped columns: Fahrzeugtyp | Betriebserlaubnis | kW | Reifen | Auflagen. Model name is the header above, not a column.",
          ],
          ABE_HUNT_VEHICLE_JSON_SCHEMA,
          isRetry ? "hunt-vehicle-retry" : "hunt-vehicle",
          6_000,
          resolveAbeTableExtractionModel(),
        );

        return typeof raw === "object" &&
          raw &&
          "vehicleMatches" in raw &&
          Array.isArray((raw as { vehicleMatches: unknown }).vehicleMatches)
          ? (raw as { vehicleMatches: unknown[] }).vehicleMatches
          : [];
      };

      const primaryRows = await extractRows(false);
      let vehicleMatches = parseAbeVehicleRows(primaryRows);

      if (vehicleMatches.length <= 1) {
        const retryRows = await extractRows(true);
        const retryMatches = parseAbeVehicleRows(retryRows);
        vehicleMatches = mergeAbeVehicleMatchRows(vehicleMatches, retryMatches);
      }

      const extraction: AbeHuntVehicleExtraction = { vehicleMatches };

      if (!isAbeHuntVehicleComplete(extraction)) {
        return {
          status: "needs_manual",
          extraction,
          reason:
            "Keine Verkaufsbezeichnung erkannt — bitte die erlaubte Fahrzeugbezeichnung manuell eintragen.",
        };
      }

      return { status: "ok", extraction };
    } catch {
      return {
        status: "needs_manual",
        extraction: empty,
        reason:
          "Fahrzeugfreigabe konnte nicht gelesen werden — bitte manuell eintragen.",
      };
    }
  }

  /** @deprecated Prefer extractKbaFromPhoto */
  extractKbaSnippet(input: DocumentBytesInput) {
    return this.extractKbaFromPhoto(input);
  }

  /**
   * Step 1 of the data hunter: extract only KBA / Nummer der ABE from a photo or PDF.
   */
  async extractKbaFromPhoto(
    input: DocumentBytesInput,
  ): Promise<AbeHuntStepResult<AbeHuntStammdatenExtraction>> {
    const empty = { ...EMPTY_STAMMDATEN };

    try {
      const normalized = this.normalizeInput(input);
      const isPdf = this.isPdfInput(normalized);
      const raw = await this.runSnippetStepWithPdfHybrid(
        normalized,
        [
          FREESTYLE_GUARD,
          "Extract ONLY the KBA approval number and optional Nummer der ABE from this document.",
          'Look for: "KBA-Nummer", "KBA Nummer", "KBA-Nr.", Kennzeichnungen table KBA-Nummer row, "Gutachten zur ABE Nr.", "Nummer der ABE".',
          "kbaNumber = digits only (e.g. 48571). Never use Gutachten-Nr. 55071011 or Genehmigungsnummer with letters.",
          'abeNumber = "Nummer der ABE" when visible, digits with optional * (e.g. 48571*08). If only one number exists, set both kbaNumber and abeNumber to the same digits.',
          ...(isPdf
            ? ["The attachment is a PDF — scan all pages for the KBA / ABE number."]
            : []),
        ],
        [
          isPdf
            ? "Find the KBA / ABE approval number anywhere in this PDF."
            : "Find the KBA / ABE approval number on this photograph.",
        ],
        ABE_HUNT_KBA_ONLY_JSON_SCHEMA,
        "hunt-kba",
        isPdf ? 2_000 : 800,
      );

      const record =
        typeof raw === "object" && raw ? (raw as Record<string, unknown>) : {};
      const asText = (value: unknown): string | null =>
        typeof value === "string" && value.trim() ? value.trim() : null;

      const extraction: AbeHuntStammdatenExtraction = {
        ...empty,
        kbaNumber: normalizeAbeKbaDigits(asText(record.kbaNumber)),
        abeNumber: normalizeAbeNumberDigits(asText(record.abeNumber)),
      };

      const finalized = finalizeAbeDataHunterReport({
        ...emptyAbeDataHunterReport(),
        kbaNumber: extraction.kbaNumber,
        abeNumber: extraction.abeNumber,
      });

      const resolved: AbeHuntStammdatenExtraction = {
        ...empty,
        kbaNumber: finalized.kbaNumber,
        abeNumber: finalized.abeNumber,
      };

      if (!inferAbeKbaFromReport(finalized)) {
        return {
          status: "needs_manual",
          extraction: resolved,
          reason:
            "KBA-Nummer nicht erkannt — bitte näher heran fotografieren oder manuell eintragen.",
        };
      }

      return { status: "ok", extraction: resolved };
    } catch {
      return {
        status: "needs_manual",
        extraction: empty,
        reason:
          "KBA-Nummer konnte nicht gelesen werden — bitte erneut fotografieren oder manuell eintragen.",
      };
    }
  }

  /**
   * Freestyle: one LLM call extracts every visible required ABE fact from a photo.
   * Always returns an extraction object (partial OK) — never throws to the route.
   */
  async extractAllFromPhoto(
    input: DocumentBytesInput,
  ): Promise<AbeHuntStepResult<AbeDataHunterReport>> {
    const empty = emptyAbeDataHunterReport();

    try {
      const normalized = this.normalizeInput(input);
      const isPdf = this.isPdfInput(normalized);
      const raw = await this.runSnippetStepWithPdfHybrid(
        normalized,
        [
          FREESTYLE_GUARD,
          "Fields: kbaNumber (digits only), abeNumber (Nummer der ABE / Gutachten zur ABE Nr., digits only), abeHolder (Inhaber / Auftraggeber), manufacturer (Hersteller / Herstellerzeichen — Prüfgegenstand or Kennzeichnungen row), partDesignation (Prüfgegenstand / Bauteilbezeichnung inkl. Radgröße), markingText (Kennzeichnungen block verbatim), vehicleMatches (Verwendungsbereich table), auflagenCodes.",
          "Never use Gutachten-Nr. or Genehmigungsnummer with letters for kbaNumber or abeNumber.",
          'For partDesignation: copy the full Prüfgegenstand line (e.g. "PKW-Sonderrad 8Jx17EH2+ Typ TAM3325-8017").',
          'For markingText: transcribe the Kennzeichnungen section verbatim — KBA-Nummer, Herstellerzeichen, Radtyp, Radgröße, Einpresstiefe. No summary.',
          "If 'Inhaber der ABE und Hersteller' is combined, set both abeHolder and manufacturer.",
          'Map "Auftraggeber" to abeHolder when no separate Inhaber der ABE label is shown.',
          "Verwendungsbereich / Fahrzeugtabelle: copy ONLY printed text. Model header above the table → verkaufsbezeichnung; FIRST data column → fahrzeugtyp (never null when visible, never invent); Betriebserlaubnis / EG-BE → typeApproval; Reifen → tireSizes. Cropped photos are often 5 columns without a Handelsbezeichnung column.",
          "Never output a vehicle model or type code that is not readable on this photo.",
          "Read digits 3 and 8 carefully in Fahrzeugtyp codes — they are often confused.",
          "TÜV Gutachten tables: ONE vehicleMatches row per printed Fahrzeugtyp code. kW-Bereich is NOT fahrzeugtyp. Reifen sizes go ONLY in tireSizes, never in typeApproval.",
          "When one table line lists multiple Fahrzeugtyp codes, emit ONE row PER printed code — same header and EG-BE on each.",
          "If ONLY a Verwendungsbereich table is visible, extract EVERY readable row into vehicleMatches — do not return an empty array when table lines are visible.",
          "Gutachten tables may list Handelsbezeichnung + Fahrzeugtyp + EG-BE in one block per vehicle — split into separate fields per row.",
          "Each vehicleMatches row must include a Fahrzeugtyp code OR an EG-BE/typeApproval value — do not invent rows from isolated Reifen sizes without Fahrzeugtyp.",
          "When Reifen sizes and a Fahrzeugtyp appear on the same table line, extract that as one row with both fields.",
          "Each row's auflagenCodes must come ONLY from that row's own Auflagen cells on the same table line — never merge codes from other rows or page headers.",
          "Merge reifenbezogene Auflagen and general Auflagen column codes into each row's auflagenCodes.",
          "When extracting vehicleMatches: put Auflagen-Kürzel ONLY in each row's auflagenCodes — never in the top-level auflagenCodes field.",
          "Do NOT copy Auflagen from rows above or below the target vehicle — each row gets only its own Auflagen column.",
          "Auflagen-Kürzel examples: 744, 166, A02, 11A, 20B, 22B, B04A, CPE, CBO — every short code from BOTH Auflagen columns on that row.",
          "Letter suffixes are letters, not digits: 22B not 228, 11A not 114, 22I not 221, 10B not 108. Copy every visible Kürzel — do not stop after the first two.",
          "CPO is NOT a valid Auflagen code — copy CPE and CBO exactly (O vs E, B vs P).",
          "NEVER put Fahrzeugtyp codes into auflagenCodes — those belong in fahrzeugtyp only.",
          "If a token looks like a vehicle type code, it is NOT an Auflagen-Kürzel.",
          "Leave auflagenNotes empty — the user scans Auflagen prose in a dedicated follow-up step.",
          ...(isPdf
            ? [
                "The attachment is a PDF — read every page and merge all visible ABE fields from the full document.",
              ]
            : []),
        ],
        [
          isPdf
            ? "Extract every visible ABE data point from all pages of this PDF."
            : "Extract every visible ABE data point from this photograph.",
          "Leave fields null/empty when not visible — the user will take more photos.",
        ],
        ABE_HUNT_ALL_JSON_SCHEMA,
        "hunt-all",
        isPdf ? 10_000 : 8_000,
      );

      const record =
        typeof raw === "object" && raw ? (raw as Record<string, unknown>) : {};
      const resolvedMarking = resolveAbeMarkingText(record);

      const rawRows =
        typeof raw === "object" &&
        raw &&
        "vehicleMatches" in raw &&
        Array.isArray((raw as { vehicleMatches: unknown }).vehicleMatches)
          ? (raw as { vehicleMatches: unknown[] }).vehicleMatches
          : [];

      const asText = (value: unknown): string | null =>
        typeof value === "string" && value.trim() ? value.trim() : null;

      const candidate = {
        kbaNumber: asText(record.kbaNumber),
        abeNumber: asText(record.abeNumber),
        abeHolder: asText(record.abeHolder),
        manufacturer: asText(record.manufacturer),
        partDesignation: asText(record.partDesignation),
        markingText: resolvedMarking,
        vehicleMatches: parseAbeVehicleRows(rawRows),
        auflagenCodes: Array.isArray(record.auflagenCodes)
          ? record.auflagenCodes.filter(
              (code): code is string =>
                typeof code === "string" && code.trim().length > 0,
            )
          : [],
        auflagenNotes: asText(record.auflagenNotes),
      };

      const parsed = AbeDataHunterReportSchema.safeParse(candidate);
      if (!parsed.success) {
        const extraction: AbeDataHunterReport = {
          ...empty,
          kbaNumber:
            normalizeAbeKbaDigits(asText(record.kbaNumber)) ||
            normalizeAbeKbaDigits(asText(record.markingNumber)) ||
            null,
          abeNumber: normalizeAbeNumberDigits(asText(record.abeNumber)) || null,
          abeHolder: asText(record.abeHolder),
          manufacturer: asText(record.manufacturer),
          partDesignation: asText(record.partDesignation),
          markingText: resolvedMarking,
          vehicleMatches: Array.isArray(record.vehicleMatches)
            ? parseAbeVehicleRows(record.vehicleMatches)
            : [],
          auflagenCodes: Array.isArray(record.auflagenCodes)
            ? record.auflagenCodes.filter(
                (code): code is string =>
                  typeof code === "string" && code.trim().length > 0,
              )
            : [],
          auflagenNotes: asText(record.auflagenNotes),
        };
        return {
          status: "needs_manual",
          extraction: finalizeAbeDataHunterReport(extraction),
          reason: "Teilweise erkannt — weitere Fotos oder manuelle Ergänzung.",
        };
      }

      const extraction: AbeDataHunterReport = {
        ...parsed.data,
        kbaNumber: normalizeAbeKbaDigits(parsed.data.kbaNumber) || null,
        abeNumber: normalizeAbeNumberDigits(parsed.data.abeNumber) || null,
        markingText: resolveAbeMarkingText({
          ...record,
          markingText: parsed.data.markingText,
          markingType: record.markingType,
          markingNumber: record.markingNumber,
        }),
      };

      const enriched = finalizeAbeDataHunterReport(extraction);

      const hasAnything =
        Boolean(enriched.kbaNumber) ||
        Boolean(enriched.abeNumber) ||
        Boolean(enriched.abeHolder) ||
        Boolean(enriched.manufacturer) ||
        Boolean(enriched.partDesignation) ||
        Boolean(enriched.markingText) ||
        enriched.vehicleMatches.length > 0 ||
        enriched.auflagenCodes.length > 0;

      return {
        status: hasAnything ? "ok" : "needs_manual",
        extraction: enriched,
        reason: hasAnything
          ? undefined
          : "Keine ABE-Daten auf diesem Foto erkannt.",
      };
    } catch {
      return {
        status: "needs_manual",
        extraction: empty,
        reason: "Foto konnte nicht gelesen werden — bitte erneut fotografieren.",
      };
    }
  }

  async extractAuflagenSnippet(
    input: DocumentBytesInput,
  ): Promise<AbeHuntStepResult<AbeHuntAuflagenExtraction>> {
    const empty: AbeHuntAuflagenExtraction = {
      auflagenCodes: [],
      auflagenNotes: null,
    };

    try {
      const raw = await this.runSnippetStep(
        input,
        [
          IMAGE_ONLY_GUARD,
          "Extract only Auflagen-Kürzel for the photographed vehicle row — not from other rows or sections above/below.",
        ],
        [
          "Extract only the requested data point from this cropped image.",
          "Collect every short Auflagen code visible in the crop for this vehicle.",
        ],
        ABE_HUNT_AUFLAGEN_JSON_SCHEMA,
        "hunt-auflagen",
        800,
      );

      const parsed = AbeHuntAuflagenSchema.safeParse(raw);
      if (!parsed.success) {
        return {
          status: "needs_manual",
          extraction: empty,
          reason:
            "Auflagen nicht erkannt — bitte die Auflagen-Kürzel zum Fahrzeug manuell eintragen.",
        };
      }

      if (!isAbeHuntAuflagenComplete(parsed.data)) {
        return {
          status: "needs_manual",
          extraction: parsed.data,
          reason:
            "Keine Auflagen-Kürzel erkannt — bitte die passenden Auflagen zum Fahrzeug manuell eintragen.",
        };
      }

      return { status: "ok", extraction: parsed.data };
    } catch {
      return {
        status: "needs_manual",
        extraction: empty,
        reason:
          "Auflagen konnten nicht gelesen werden — bitte manuell eintragen.",
      };
    }
  }

  async extractAuflagenTextFromPhoto(
    input: DocumentBytesInput,
    targetCodes: string[],
  ): Promise<AbeHuntStepResult<AbeHuntAuflagenTextExtraction>> {
    const codesHint =
      targetCodes.length > 0
        ? `Target Auflagen codes for this scan (first code is the one the user is photographing now): ${targetCodes.join(", ")}. Transcribe every target code that is visible. If the photo is a long condition paragraph without a printed Kürzel, assign the full verbatim text to the first target code.`
        : "Extract all visible Auflagen / conditions prose on this page.";

    try {
      const raw = await this.runSnippetStep(
        input,
        [
          FREESTYLE_GUARD,
          codesHint,
          "Transcribe the full Auflagen / Bedingungen / Hinweise text verbatim, including long paragraphs and numbered items. Do not summarize.",
          "Format each code block as CODE: full paragraph text.",
          "Do NOT invent codes. Fahrzeugtyp codes (G20, K40, T67, …) are not Auflagen unless they appear in the target list.",
          "CPO is invalid — if the document shows CPE or CBO, transcribe those letters exactly.",
          "If a code is not in the target list above, do not include it in auflagenNotes or regions.",
          "For each transcribed code, also return a normalized bounding box (0–1) covering that printed paragraph.",
        ],
        [
          "Extract the complete Auflagen text visible in this photograph — including large text blocks.",
          "Copy wording exactly as printed on the ABE document.",
          "Return one regions entry per transcribed code block only.",
        ],
        ABE_HUNT_AUFLAGEN_TEXT_JSON_SCHEMA,
        "hunt-auflagen-text",
        8_000,
        resolveAbeContextModel(),
        { maxEdgePx: LLM_IMAGE_MAX_EDGE_PX },
      );

      const record =
        typeof raw === "object" && raw ? (raw as Record<string, unknown>) : {};
      const notes =
        typeof record.auflagenNotes === "string"
          ? record.auflagenNotes.trim()
          : "";
      const targetSet = new Set(
        targetCodes.map((code) => code.trim().toUpperCase()).filter(Boolean),
      );
      const regions = parseAuflagenRegions(record.regions)
        .map((region) => ({
          ...region,
          code: correctAuflagenKuerzelOcr(region.code, {
            allowlist: targetCodes,
            rawContext: notes,
          }),
        }))
        .filter((region) =>
          targetSet.size === 0 ? true : targetSet.has(region.code),
        );
      const attributedNotes =
        targetSet.size > 0
          ? attributeAuflagenScanNotes(notes, targetCodes) ?? notes
          : notes;
      const sanitizedNotes =
        targetSet.size > 0
          ? sanitizeAuflagenNotesForTargetCodes(attributedNotes, targetCodes) ??
            attributedNotes
          : attributedNotes;

      if (!sanitizedNotes) {
        return {
          status: "needs_manual",
          extraction: { auflagenNotes: null, regions: [] },
          reason:
            "Kein Auflagen-Text erkannt — bitte den Abschnitt erneut fotografieren.",
        };
      }

      return {
        status: "ok",
        extraction: { auflagenNotes: sanitizedNotes, regions },
      };
    } catch {
      return {
        status: "needs_manual",
        extraction: { auflagenNotes: null, regions: [] },
        reason:
          "Auflagen-Text konnte nicht gelesen werden — bitte erneut fotografieren.",
      };
    }
  }

  private normalizeInput(input: DocumentBytesInput): DocumentBytesInput {
    return {
      bytes: input.bytes,
      contentType: resolveDocumentContentType(input.bytes, input.contentType),
    };
  }

  private isPdfInput(input: DocumentBytesInput): boolean {
    return (
      input.contentType === "application/pdf" || isPdfBuffer(input.bytes)
    );
  }

  private async runTextSnippetStep(
    systemLines: string[],
    instructionLines: string[],
    jsonSchema: JsonSchema,
    stepLabel: string,
    maxTokens: number,
    model: string = resolveAbeContextModel(),
  ): Promise<unknown> {
    let client: OpenAI;
    let resolvedModel: string;
    try {
      ({ client, model: resolvedModel } = getOcrLlmClient({ model }));
    } catch (error) {
      throw new TextParseError(
        error instanceof Error ? error.message : "LLM client is not configured.",
      );
    }

    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await client.chat.completions.create({
        model: resolvedModel,
        max_completion_tokens: maxTokens,
        response_format: {
          type: "json_schema",
          json_schema: jsonSchema,
        },
        messages: [
          { role: "system", content: systemLines.join(" ") },
          {
            role: "user",
            content: instructionLines.filter((line) => line.length > 0).join("\n"),
          },
        ],
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "LLM request failed.";
      throw new TextParseError(
        `ABE data-hunter ${stepLabel} failed: ${message}`,
      );
    }

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new TextParseError(
        `ABE data-hunter ${stepLabel} returned an empty response.`,
      );
    }

    try {
      return extractJsonObject(content);
    } catch {
      throw new TextParseError(
        `ABE data-hunter ${stepLabel} returned invalid JSON.`,
      );
    }
  }

  private async runSnippetStepWithPdfHybrid(
    input: DocumentBytesInput,
    systemLines: string[],
    instructionLines: string[],
    jsonSchema: JsonSchema,
    stepLabel: string,
    maxTokens: number,
    model: string = resolveAbeContextModel(),
    prepareOptions?: PrepareDocumentForLlmOptions,
  ): Promise<unknown> {
    if (this.isPdfInput(input) && isAzureMarkdownLayoutAvailable()) {
      try {
        const { markdown } = await extractMarkdownFromAzureLayout(
          input.bytes,
          input.contentType,
        );
        return this.runTextSnippetStep(
          systemLines,
          [...instructionLines, "", markdown],
          jsonSchema,
          stepLabel,
          maxTokens,
          model,
        );
      } catch (error) {
        console.warn(
          `[AbeDataHunter] hybrid ${stepLabel} failed, trying vision`,
          error,
        );
      }
    }

    return this.runSnippetStep(
      input,
      systemLines,
      instructionLines,
      jsonSchema,
      stepLabel,
      maxTokens,
      model,
      prepareOptions,
    );
  }

  private async runSnippetStep(
    input: DocumentBytesInput,
    systemLines: string[],
    instructionLines: string[],
    jsonSchema: JsonSchema,
    stepLabel: string,
    maxTokens: number,
    model: string = resolveAbeContextModel(),
    prepareOptions?: PrepareDocumentForLlmOptions,
  ): Promise<unknown> {
    let client: OpenAI;
    let resolvedModel: string;
    try {
      ({ client, model: resolvedModel } = getOcrLlmClient({
        model,
      }));
    } catch (error) {
      throw new TextParseError(
        error instanceof Error ? error.message : "LLM client is not configured.",
      );
    }

    const isPdf =
      input.contentType === "application/pdf" || isPdfBuffer(input.bytes);
    const maxPdfPages =
      prepareOptions?.maxPdfPages ??
      (stepLabel === "hunt-all" || stepLabel === "hunt-kba"
        ? ABE_HUNT_MAX_PDF_PAGES
        : LLM_INVOICE_MAX_PDF_PAGES);

    const userContent = await buildAbeVisionUserMessage(instructionLines, input, {
      ...(isPdf ? { maxPdfPages } : {}),
      prepareOptions,
    });

    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await client.chat.completions.create({
        model: resolvedModel,
        max_completion_tokens: maxTokens,
        response_format: {
          type: "json_schema",
          json_schema: jsonSchema,
        },
        messages: [
          { role: "system", content: systemLines.join(" ") },
          { role: "user", content: userContent },
        ],
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "LLM request failed.";
      throw new TextParseError(
        `ABE data-hunter ${stepLabel} failed: ${message}`,
      );
    }

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new TextParseError(
        `ABE data-hunter ${stepLabel} returned an empty response.`,
      );
    }

    try {
      return extractJsonObject(content);
    } catch {
      throw new TextParseError(
        `ABE data-hunter ${stepLabel} returned invalid JSON.`,
      );
    }
  }
}

export const abeDataHunterExtractionService =
  new AbeDataHunterExtractionService();

export const AbeExtractionService = AbeDataHunterExtractionService;
export const abeExtractionService = abeDataHunterExtractionService;
