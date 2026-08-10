import type OpenAI from "openai";

import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import {
  buildDocumentUserMessage,
  type DocumentBytesInput,
} from "@/lib/ocr/llm-document-content";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";
import { TextParseError } from "@/lib/ocr/parse-error";
import { parseAbeVehicleRows } from "@/lib/ocr/abe-wizard-vehicle-normalize";
import { resolveAbeMarkingText } from "@/lib/ocr/abe-marking-from-text";
import {
  normalizeAbeKbaDigits,
  normalizeAbeNumberDigits,
} from "@/lib/validations/abeSchema";
import {
  ABE_HUNT_ALL_JSON_SCHEMA,
  ABE_HUNT_AUFLAGEN_JSON_SCHEMA,
  ABE_HUNT_AUFLAGEN_TEXT_JSON_SCHEMA,
  ABE_HUNT_MARKING_JSON_SCHEMA,
  ABE_HUNT_STAMMDATEN_JSON_SCHEMA,
  ABE_HUNT_VEHICLE_JSON_SCHEMA,
  AbeDataHunterReportSchema,
  AbeHuntAuflagenSchema,
  AbeHuntMarkingSchema,
  AbeHuntStammdatenSchema,
  emptyAbeDataHunterReport,
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
import { resolveAbeContextModel } from "@/services/ocr/AbeExtractionService";

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
          "Extract ABE master data: kbaNumber (digits only), abeNumber (Nummer der ABE, digits only), abeHolder (Inhaber der ABE / Auftraggeber), manufacturer (Hersteller / Herstellerzeichen), partDesignation (Bezeichnung des Bauteils).",
          "Never put Gutachten-Nr. or Genehmigungsnummer with letters into kbaNumber or abeNumber.",
          "If 'Inhaber der ABE und Hersteller' is combined, set both abeHolder and manufacturer to that value.",
          'Map "Auftraggeber" to abeHolder when no separate Inhaber der ABE label is shown.',
        ],
        [
          "Extract only the requested data points from this cropped image.",
          "Look for KBA, Nummer der ABE, Inhaber der ABE, Auftraggeber, Hersteller, Herstellerzeichen, and the part designation (Gerät/Typ/Design).",
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

      if (!isAbeHuntStammdatenComplete(extraction)) {
        return {
          status: "needs_manual",
          extraction,
          reason:
            "Nicht alle Stammdaten erkannt — fehlende Pflichtfelder bitte manuell ergänzen.",
        };
      }

      return { status: "ok", extraction };
    } catch {
      return {
        status: "needs_manual",
        extraction: EMPTY_STAMMDATEN,
        reason:
          "Stammdaten konnten nicht gelesen werden — bitte manuell eintragen.",
      };
    }
  }

  /** @deprecated Prefer extractStammdatenSnippet */
  extractKbaSnippet(input: DocumentBytesInput) {
    return this.extractStammdatenSnippet(input);
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
      const raw = await this.runSnippetStep(
        input,
        [
          IMAGE_ONLY_GUARD,
          "Extract only vehicle-table rows with Verkaufsbezeichnung (allowed vehicles).",
          "Copy Verkaufsbezeichnung onto every row of that group.",
        ],
        [
          "Extract only the requested data point from this cropped image.",
          "Read every visible Fahrzeug-Tabelle row under the Verkaufsbezeichnung.",
        ],
        ABE_HUNT_VEHICLE_JSON_SCHEMA,
        "hunt-vehicle",
        3_500,
      );

      const rawRows =
        typeof raw === "object" &&
        raw &&
        "vehicleMatches" in raw &&
        Array.isArray((raw as { vehicleMatches: unknown }).vehicleMatches)
          ? (raw as { vehicleMatches: unknown[] }).vehicleMatches
          : [];

      const extraction: AbeHuntVehicleExtraction = {
        vehicleMatches: parseAbeVehicleRows(rawRows),
      };

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

  /**
   * Freestyle: one LLM call extracts every visible required ABE fact from a photo.
   * Always returns an extraction object (partial OK) — never throws to the route.
   */
  async extractAllFromPhoto(
    input: DocumentBytesInput,
  ): Promise<AbeHuntStepResult<AbeDataHunterReport>> {
    const empty = emptyAbeDataHunterReport();

    try {
      const isPdf = input.contentType === "application/pdf";
      const raw = await this.runSnippetStep(
        input,
        [
          FREESTYLE_GUARD,
          "Fields: kbaNumber (digits only), abeNumber (Nummer der ABE, digits only), abeHolder (Inhaber / Auftraggeber), manufacturer (Hersteller / Herstellerzeichen), partDesignation (Bauteilbezeichnung), markingText (Kennzeichnung), vehicleMatches (Fahrzeugtabelle with Verkaufsbezeichnung), auflagenCodes.",
          "Never use Gutachten-Nr. or Genehmigungsnummer with letters for kbaNumber or abeNumber.",
          'For markingText: transcribe the full Kennzeichnung section verbatim — exact text after the heading, including table rows (Art der Kennzeichnung, Nummer). No summary.',
          "If 'Inhaber der ABE und Hersteller' is combined, set both abeHolder and manufacturer.",
          'Map "Auftraggeber" to abeHolder when no separate Inhaber der ABE label is shown.',
          "When extracting vehicleMatches: put Auflagen-Kürzel ONLY in each row's auflagenCodes — never in the top-level auflagenCodes field.",
          "Do NOT copy Auflagen from rows above or below the target vehicle — each row gets only its own Auflagen column.",
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
        isPdf ? 6_000 : 4_000,
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

      const candidate = {
        ...(typeof raw === "object" && raw ? raw : {}),
        vehicleMatches: parseAbeVehicleRows(rawRows),
      };

      const parsed = AbeDataHunterReportSchema.safeParse(candidate);
      if (!parsed.success) {
        const asText = (value: unknown): string | null =>
          typeof value === "string" && value.trim() ? value.trim() : null;

        const extraction: AbeDataHunterReport = {
          ...empty,
          kbaNumber: normalizeAbeKbaDigits(asText(record.kbaNumber)) || null,
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
          extraction,
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

      const hasAnything =
        Boolean(extraction.kbaNumber) ||
        Boolean(extraction.abeNumber) ||
        Boolean(extraction.abeHolder) ||
        Boolean(extraction.manufacturer) ||
        Boolean(extraction.partDesignation) ||
        Boolean(extraction.markingText) ||
        extraction.vehicleMatches.length > 0 ||
        extraction.auflagenCodes.length > 0;

      return {
        status: hasAnything ? "ok" : "needs_manual",
        extraction,
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
  ): Promise<AbeHuntStepResult<{ auflagenNotes: string | null }>> {
    const codesHint =
      targetCodes.length > 0
        ? `Target Auflagen codes from the vehicle table: ${targetCodes.join(", ")}.`
        : "Extract all visible Auflagen / conditions prose on this page.";

    try {
      const raw = await this.runSnippetStep(
        input,
        [
          FREESTYLE_GUARD,
          codesHint,
          "Transcribe the full Auflagen / Bedingungen / Hinweise text verbatim.",
          "Include section headings and numbered items. Do not summarize.",
          "If multiple codes are visible, include every matching paragraph.",
        ],
        [
          "Extract the complete Auflagen text visible in this photograph.",
          "Copy wording exactly as printed on the ABE document.",
        ],
        ABE_HUNT_AUFLAGEN_TEXT_JSON_SCHEMA,
        "hunt-auflagen-text",
        2_000,
      );

      const notes =
        typeof raw === "object" &&
        raw &&
        "auflagenNotes" in raw &&
        typeof (raw as { auflagenNotes: unknown }).auflagenNotes === "string"
          ? (raw as { auflagenNotes: string }).auflagenNotes.trim()
          : "";

      if (!notes) {
        return {
          status: "needs_manual",
          extraction: { auflagenNotes: null },
          reason:
            "Kein Auflagen-Text erkannt — bitte den Abschnitt erneut fotografieren.",
        };
      }

      return { status: "ok", extraction: { auflagenNotes: notes } };
    } catch {
      return {
        status: "needs_manual",
        extraction: { auflagenNotes: null },
        reason:
          "Auflagen-Text konnte nicht gelesen werden — bitte erneut fotografieren.",
      };
    }
  }

  private async runSnippetStep(
    input: DocumentBytesInput,
    systemLines: string[],
    instructionLines: string[],
    jsonSchema: JsonSchema,
    stepLabel: string,
    maxTokens: number,
  ): Promise<unknown> {
    let client: OpenAI;
    let resolvedModel: string;
    try {
      ({ client, model: resolvedModel } = getOcrLlmClient({
        model: resolveAbeContextModel(),
      }));
    } catch (error) {
      throw new TextParseError(
        error instanceof Error ? error.message : "LLM client is not configured.",
      );
    }

    const userContent = buildDocumentUserMessage(instructionLines, input);

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
