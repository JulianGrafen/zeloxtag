import type OpenAI from "openai";

import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import {
  buildDocumentUserMessage,
  type DocumentBytesInput,
} from "@/lib/ocr/llm-document-content";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";
import { TextParseError } from "@/lib/ocr/parse-error";
import { parseAbeVehicleRows } from "@/lib/ocr/abe-wizard-vehicle-normalize";
import { coerceAbeMarkingText } from "@/lib/ocr/abe-marking-from-text";
import { normalizeAbeKbaDigits } from "@/lib/validations/abeSchema";
import {
  ABE_HUNT_ALL_JSON_SCHEMA,
  ABE_HUNT_AUFLAGEN_JSON_SCHEMA,
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
          "Extract ABE master data: kbaNumber, abeNumber (Nummer der ABE), abeHolder (Inhaber der ABE), manufacturer (Hersteller), partDesignation (Bezeichnung des Bauteils).",
          "If 'Inhaber der ABE und Hersteller' is combined, set both abeHolder and manufacturer to that value.",
        ],
        [
          "Extract only the requested data points from this cropped image.",
          "Look for KBA, Nummer der ABE, Inhaber der ABE, Hersteller, and the part designation (Gerät/Typ/Design).",
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
        markingText: coerceAbeMarkingText(
          typeof raw === "object" && raw && "markingText" in raw
            ? (raw as { markingText: unknown }).markingText
            : raw,
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
      const raw = await this.runSnippetStep(
        input,
        [
          FREESTYLE_GUARD,
          "Fields: kbaNumber, abeNumber (Nummer der ABE), abeHolder (Inhaber), manufacturer (Hersteller), partDesignation (Bauteilbezeichnung), markingText (Kennzeichnung), vehicleMatches (Fahrzeugtabelle with Verkaufsbezeichnung), auflagenCodes.",
          'For markingText: transcribe the full Kennzeichnung section verbatim — exact text after the heading, including table rows (Art der Kennzeichnung, Nummer). No summary.',
          "If 'Inhaber der ABE und Hersteller' is combined, set both abeHolder and manufacturer.",
          "Copy Auflagen-Kürzel from the table row and from any Auflagen list visible on this photo.",
        ],
        [
          "Extract every visible ABE data point from this photograph.",
          "Leave fields null/empty when not visible — the user will take more photos.",
        ],
        ABE_HUNT_ALL_JSON_SCHEMA,
        "hunt-all",
        4_000,
      );

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
        const record =
          typeof candidate === "object" && candidate
            ? (candidate as Record<string, unknown>)
            : {};
        const asText = (value: unknown): string | null =>
          typeof value === "string" && value.trim() ? value.trim() : null;

        const asMarking = (value: unknown): string | null =>
          coerceAbeMarkingText(value);

        const extraction: AbeDataHunterReport = {
          ...empty,
          kbaNumber: normalizeAbeKbaDigits(asText(record.kbaNumber)) || null,
          abeNumber: asText(record.abeNumber),
          abeHolder: asText(record.abeHolder),
          manufacturer: asText(record.manufacturer),
          partDesignation: asText(record.partDesignation),
          markingText: asMarking(record.markingText),
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
        markingText: coerceAbeMarkingText(parsed.data.markingText),
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
          "Extract only Auflagen-Kürzel that apply to the selected vehicle, plus optional notes.",
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
