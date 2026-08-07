import type OpenAI from "openai";

import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import {
  buildDocumentUserMessage,
  type DocumentBytesInput,
} from "@/lib/ocr/llm-document-content";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";
import { DEFAULT_PARSE_MODEL } from "@/lib/ocr/model-routing";
import { TextParseError } from "@/lib/ocr/parse-error";
import {
  ABE_MINIMAL_JSON_SCHEMA,
  AbeMinimalSchema,
  formatAbeVehicleContextLabel,
  normalizeAbeMinimal,
  type AbeMinimal,
  type AbeVehicleContext,
} from "@/lib/validations/abeSchema";
import {
  ABE_WIZARD_COVER_JSON_SCHEMA,
  ABE_WIZARD_MAIN_JSON_SCHEMA,
  ABE_WIZARD_VEHICLES_JSON_SCHEMA,
  AbeWizardCoverSchema,
  AbeWizardMainSchema,
  AbeWizardVehiclesSchema,
  type AbeWizardCoverExtraction,
  type AbeWizardMainExtraction,
  type AbeWizardVehiclesExtraction,
} from "@/lib/validations/abeWizardSchemas";
import { tableMatchingService } from "@/services/ocr/TableMatchingService";

/** Cover-only extract (no garage vehicle). */
export const ABE_COVER_MAX_PAGES = 2;
export const ABE_COVER_MAX_CHARS = 6_000;

/**
 * With vehicle context we must reach Verwendungsbereich tables —
 * larger window + mid-tier model.
 */
export const ABE_CONTEXT_MAX_PAGES = 12;
export const ABE_CONTEXT_MAX_CHARS = 40_000;
const COVER_PARSE_MAX_TOKENS = 500;
const CONTEXT_PARSE_MAX_TOKENS = 1_200;

/** Higher-context deployment for compatibility-table scans. */
export function resolveAbeContextModel(): string {
  return (
    process.env.FOUNDRY_MODEL_ABE_CONTEXT?.trim() ||
    process.env.FOUNDRY_MODEL_NAME?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o"
  );
}

const PAGE_MARKER =
  /(?:^|\n)\s*(?:---+)?\s*Seite\s+(\d+)\s*(?:---+)?\s*(?:\n|$)/gi;

/**
 * Keep only the first `maxPages` of OCR text.
 * Supports `--- Seite N ---` markers; otherwise truncates by char budget.
 */
export function truncateAbeCoverPages(
  rawText: string,
  maxPages: number = ABE_COVER_MAX_PAGES,
  maxChars: number = ABE_COVER_MAX_CHARS,
): string {
  const normalized = rawText.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  const markers = [...normalized.matchAll(PAGE_MARKER)];
  if (markers.length >= 2) {
    const pageStarts: Array<{ page: number; index: number }> = markers.map(
      (match) => ({
        page: Number.parseInt(match[1] ?? "0", 10),
        index: match.index ?? 0,
      }),
    );

    const first = pageStarts.find((entry) => entry.page === 1) ?? pageStarts[0];
    if (first) {
      const cutAt = pageStarts.find(
        (entry) => entry.page > first.page + (maxPages - 1),
      );
      const sliced = normalized
        .slice(first.index, cutAt?.index ?? normalized.length)
        .trim();
      if (sliced.length >= 8) {
        return sliced.slice(0, maxChars);
      }
    }
  }

  if (normalized.includes("\f")) {
    const pages = normalized.split("\f").filter((page) => page.trim());
    return pages.slice(0, maxPages).join("\n\n").trim().slice(0, maxChars);
  }

  return normalized.slice(0, maxChars);
}

/**
 * Build cover / window text from Azure DI page line blocks.
 */
export function coverTextFromPageBlocks(
  pageBlocks: string[],
  maxPages: number = ABE_COVER_MAX_PAGES,
  maxChars: number = ABE_COVER_MAX_CHARS,
): string {
  const joined = pageBlocks
    .slice(0, maxPages)
    .map((block, index) => {
      const body = block.trim();
      if (!body) return "";
      return `--- Seite ${index + 1} ---\n${body}`;
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();

  return joined.slice(0, maxChars);
}

export function buildAbeSystemPrompt(
  vehicleContext?: AbeVehicleContext | null,
): string {
  if (!vehicleContext) {
    return [
      "You are a strict data extractor for German car documents.",
      "Read the cover page text.",
      "Extract the KBA-Nummer, Manufacturer, Part Category, and Part Type.",
      "Set userVehicleMatchStatus, matchedConditions, matchedVehicleRow, and compatibilityTable to null",
      "(no target vehicle was provided).",
      "Return ONLY valid JSON matching the schema.",
      "If a base value is not on this page, return null for that field.",
    ].join(" ");
  }

  const target = formatAbeVehicleContextLabel(vehicleContext);
  const extras = [
    vehicleContext.type ? `Type code: ${vehicleContext.type}` : null,
    vehicleContext.egBe ? `EG-BE: ${vehicleContext.egBe}` : null,
  ]
    .filter(Boolean)
    .join(". ");

  return [
    "You are a strict data extractor for German car documents.",
    "1. Extract the base data (KBA, Manufacturer, Part Category, Part Type).",
    `2. TARGET VEHICLE CHECK: The user drives a ${target}.${extras ? ` ${extras}.` : ""}`,
    "Scan the 'Verwendungsbereich' (Compatibility Table) specifically for THIS vehicle.",
    "- If you find a match, set 'userVehicleMatchStatus' to 'verified', extract the exact row into 'matchedVehicleRow', and extract any specific conditions/Auflagen listed for this row into 'matchedConditions'.",
    "- If you do not find this exact vehicle, set status to 'not_found' and set matchedVehicleRow/matchedConditions to null.",
    "- If the table is too complex or unreadable, set status to 'needs_manual_check' and set matchedVehicleRow/matchedConditions to null.",
    "When the Verwendungsbereich is tabular, also fill 'compatibilityTable' with headers + rows (isUserVehicleMatch=false, matchReason=null for every row). Otherwise set compatibilityTable to null.",
    "Return ONLY valid JSON matching the schema.",
  ].join(" ");
}

export type AbeExtractionOptions = {
  /** Override chat deployment. */
  model?: string;
  maxPages?: number;
  maxChars?: number;
  /**
   * Garage vehicle for Verwendungsbereich match.
   * When omitted, vehicle check is skipped (match fields → null).
   */
  vehicleContext?: AbeVehicleContext | null;
};

/**
 * ABE extractor — cover-only (nano) or context-aware table scan (mid-tier).
 */
export class AbeExtractionService {
  async extractFromDocument(
    input: DocumentBytesInput,
    options: AbeExtractionOptions = {},
  ): Promise<AbeMinimal> {
    const vehicleContext = options.vehicleContext ?? null;
    const withContext = Boolean(vehicleContext);

    const model =
      options.model?.trim() ||
      (withContext ? resolveAbeContextModel() : DEFAULT_PARSE_MODEL);

    let client: OpenAI;
    let resolvedModel: string;
    try {
      ({ client, model: resolvedModel } = getOcrLlmClient({ model }));
    } catch (error) {
      throw new TextParseError(
        error instanceof Error ? error.message : "LLM client is not configured.",
      );
    }

    const systemPrompt = buildAbeSystemPrompt(vehicleContext);
    const instructionLines = withContext
      ? [
          "German ABE / Teilegutachten document (cover + Verwendungsbereich).",
          `TARGET VEHICLE: ${formatAbeVehicleContextLabel(vehicleContext!)}`,
          "Extract base fields + userVehicleMatchStatus / matchedVehicleRow / matchedConditions.",
        ]
      : [
          "German ABE / Teilegutachten cover page.",
          "Extract: kbaNumber (digits only), testingOrganization, manufacturer, partCategory, partType.",
          "Set userVehicleMatchStatus, matchedConditions, matchedVehicleRow to null.",
        ];

    const userContent = buildDocumentUserMessage(instructionLines, input);

    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await client.chat.completions.create({
        model: resolvedModel,
        max_completion_tokens: withContext
          ? CONTEXT_PARSE_MAX_TOKENS
          : COVER_PARSE_MAX_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: ABE_MINIMAL_JSON_SCHEMA,
        },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "LLM request failed.";
      throw new TextParseError(`ABE extract failed: ${message}`);
    }

    return this.normalizeExtracted(
      completion,
      withContext,
      vehicleContext,
    );
  }

  async extractFromText(
    rawText: string,
    options: AbeExtractionOptions = {},
  ): Promise<AbeMinimal> {
    const vehicleContext = options.vehicleContext ?? null;
    const withContext = Boolean(vehicleContext);

    const maxPages =
      options.maxPages ??
      (withContext ? ABE_CONTEXT_MAX_PAGES : ABE_COVER_MAX_PAGES);
    const maxChars =
      options.maxChars ??
      (withContext ? ABE_CONTEXT_MAX_CHARS : ABE_COVER_MAX_CHARS);

    const windowText = truncateAbeCoverPages(rawText, maxPages, maxChars);

    if (windowText.length < 8) {
      throw new TextParseError(
        "OCR-Text ist zu kurz für die ABE-Extraktion.",
      );
    }

    const model =
      options.model?.trim() ||
      (withContext ? resolveAbeContextModel() : DEFAULT_PARSE_MODEL);

    let client: OpenAI;
    let resolvedModel: string;
    try {
      ({ client, model: resolvedModel } = getOcrLlmClient({ model }));
    } catch (error) {
      throw new TextParseError(
        error instanceof Error ? error.message : "LLM client is not configured.",
      );
    }

    const systemPrompt = buildAbeSystemPrompt(vehicleContext);
    const userLines = withContext
      ? [
          "German ABE / Teilegutachten OCR (cover + Verwendungsbereich window).",
          `TARGET VEHICLE: ${formatAbeVehicleContextLabel(vehicleContext!)}`,
          "Extract base fields + userVehicleMatchStatus / matchedVehicleRow / matchedConditions.",
          "",
          windowText,
        ]
      : [
          "Cover page OCR (German ABE / Teilegutachten).",
          "Extract: kbaNumber (digits only), testingOrganization, manufacturer, partCategory, partType.",
          "Set userVehicleMatchStatus, matchedConditions, matchedVehicleRow to null.",
          "",
          windowText,
        ];

    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await client.chat.completions.create({
        model: resolvedModel,
        max_completion_tokens: withContext
          ? CONTEXT_PARSE_MAX_TOKENS
          : COVER_PARSE_MAX_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: ABE_MINIMAL_JSON_SCHEMA,
        },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userLines.join("\n") },
        ],
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "LLM request failed.";
      throw new TextParseError(`ABE extract failed: ${message}`);
    }

    return this.normalizeExtracted(
      completion,
      withContext,
      vehicleContext,
    );
  }

  private normalizeExtracted(
    completion: OpenAI.Chat.Completions.ChatCompletion,
    withContext: boolean,
    vehicleContext: AbeVehicleContext | null,
  ): AbeMinimal {
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new TextParseError("ABE extract returned an empty response.");
    }

    let parsedJson: unknown;
    try {
      parsedJson = extractJsonObject(content);
    } catch {
      throw new TextParseError("ABE extract returned invalid JSON.");
    }

    const parsed = AbeMinimalSchema.safeParse(parsedJson);
    if (!parsed.success) {
      throw new TextParseError(
        "ABE extract payload failed schema validation.",
      );
    }

    const normalized = normalizeAbeMinimal(parsed.data);

    if (!withContext) {
      return {
        ...normalized,
        userVehicleMatchStatus: null,
        matchedConditions: null,
        matchedVehicleRow: null,
        compatibilityTable: normalized.compatibilityTable
          ? tableMatchingService.matchTable(
              normalized.compatibilityTable,
              null,
            ).table
          : null,
      };
    }

    if (!normalized.compatibilityTable) {
      return normalized;
    }

    const { table: matchedTable, matchedRowIds } =
      tableMatchingService.matchTable(
        normalized.compatibilityTable,
        vehicleContext,
      );

    const matchedRow = matchedTable.rows.find((row) => row.isUserVehicleMatch);
    const shouldPromoteMatch =
      matchedRowIds.length > 0 &&
      normalized.userVehicleMatchStatus !== "needs_manual_check";

    return {
      ...normalized,
      compatibilityTable: matchedTable,
      userVehicleMatchStatus: shouldPromoteMatch
        ? "verified"
        : normalized.userVehicleMatchStatus,
      matchedVehicleRow: shouldPromoteMatch
        ? matchedRow?.cells.filter(Boolean).join(" · ") ||
          normalized.matchedVehicleRow
        : normalized.matchedVehicleRow,
    };
  }

  // ─── Guided wizard step extractions ─────────────────────────────────────────

  private static readonly WIZARD_IMAGE_ONLY_GUARD =
    "CRITICAL: Read ONLY the attached photograph. Extract values visibly printed on THIS page. " +
    "Never invent data or reuse example values from these instructions. " +
    "If a field or table is not visible, use null or an empty array.";

  /**
   * Step 1 of the ABE wizard — extract cover-page fields from the photographed page.
   */
  async extractCoverFromDocument(
    input: DocumentBytesInput,
  ): Promise<AbeWizardCoverExtraction> {
    const raw = await this.runWizardStep<AbeWizardCoverExtraction>(
      input,
      [
        AbeExtractionService.WIZARD_IMAGE_ONLY_GUARD,
        "You extract German wheel-approval (ABE / Rad-Gutachten) cover pages.",
        "Fields: kbaNumber (digits only, no 'KBA' prefix), abeNumber, manufacturer, designType, dimensions, articleNumbers.",
        "designType: join multiple DESIGN lines with ' / '. articleNumbers: every printed article code as separate entries.",
        "Return ONLY valid JSON matching the schema.",
      ],
      [
        "Extract the cover page fields from this photograph only.",
        "Look for printed labels such as KBA, ABE/Rad-Gutachten-Nr., DESIGN, GRÖSSE, ZU RAD-ARTIKEL-NR.",
      ],
      ABE_WIZARD_COVER_JSON_SCHEMA,
      AbeWizardCoverSchema,
      600,
      "cover",
      { model: resolveAbeContextModel() },
    );
    return {
      ...raw,
      designType: raw.designType
        ? raw.designType.replace(/\s*\n\s*/g, " / ").trim()
        : null,
    };
  }

  /**
   * Step 2 of the ABE wizard — extract main ABE certificate fields.
   */
  async extractMainFromDocument(
    input: DocumentBytesInput,
  ): Promise<AbeWizardMainExtraction> {
    return this.runWizardStep<AbeWizardMainExtraction>(
      input,
      [
        AbeExtractionService.WIZARD_IMAGE_ONLY_GUARD,
        "You extract German ABE certificate main pages.",
        "Fields: abeNumber (incl. suffix after *), abeHolder, manufacturer, testingOrganization.",
        "If the label is combined ('Inhaber der ABE und Hersteller:'), set both abeHolder and manufacturer.",
        "Return ONLY valid JSON matching the schema.",
      ],
      [
        "Extract the main ABE page from this photograph only.",
        "Look for 'Nummer der ABE:', 'Inhaber der ABE', 'Hersteller', and the issuing authority at the top.",
      ],
      ABE_WIZARD_MAIN_JSON_SCHEMA,
      AbeWizardMainSchema,
      400,
      "main",
      { model: resolveAbeContextModel() },
    );
  }

  /**
   * Step 3 of the ABE wizard — extract vehicle compatibility table rows from the photo.
   */
  async extractVehiclesFromDocument(
    input: DocumentBytesInput,
  ): Promise<AbeWizardVehiclesExtraction> {
    return this.runWizardStep<AbeWizardVehiclesExtraction>(
      input,
      [
        AbeExtractionService.WIZARD_IMAGE_ONLY_GUARD,
        "You extract German ABE Fahrzeug- und Auflagen-Tabelle pages.",
        "Create one vehicleMatches entry for every visible table row in the photograph.",
        "If no compatibility table is visible, return vehicleMatches: [].",
        "Column mapping:",
        "- model: Verkaufsbezeichnung group header text for that row (verbatim). Do NOT use Fahrzeugtyp codes.",
        "- typeApproval: Betriebserlaubnis cell verbatim.",
        "- driveType: first drive-type word in Auflagen column only (Allradantrieb / Heckantrieb / Frontantrieb), else null.",
        "- tireSizes: all tyre sizes from Reifen column; strip leading kW ranges.",
        "- auflagenCodes: all codes and short notes from Auflagen column except drive-type words.",
        "Do not merge rows. Do not skip rows. Do not add rows that are not visible.",
        "Return ONLY valid JSON matching the schema.",
      ],
      [
        "Extract every visible row from the Fahrzeug- und Auflagen-Tabelle in this photograph.",
        "Typical columns: Fahrzeugtyp | Betriebserlaubnis | kW | Reifen | Auflagen zu Reifen | Auflagen.",
        "Use only text you can read on this image. If the table is missing or unreadable, return an empty array.",
      ],
      ABE_WIZARD_VEHICLES_JSON_SCHEMA,
      AbeWizardVehiclesSchema,
      4000,
      "vehicles",
      { model: resolveAbeContextModel() },
    );
  }

  /** Shared LLM call pattern for all three wizard steps. */
  private async runWizardStep<T>(
    input: DocumentBytesInput,
    systemLines: string[],
    instructionLines: string[],
    jsonSchema: (typeof ABE_WIZARD_COVER_JSON_SCHEMA | typeof ABE_WIZARD_MAIN_JSON_SCHEMA | typeof ABE_WIZARD_VEHICLES_JSON_SCHEMA),
    zodSchema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } },
    maxTokens: number,
    stepLabel: string,
    options?: { model?: string },
  ): Promise<T> {
    let client: OpenAI;
    let resolvedModel: string;
    try {
      ({ client, model: resolvedModel } = getOcrLlmClient({
        model: options?.model ?? resolveAbeContextModel(),
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
      const message = error instanceof Error ? error.message : "LLM request failed.";
      throw new TextParseError(`ABE wizard ${stepLabel} extract failed: ${message}`);
    }

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new TextParseError(`ABE wizard ${stepLabel} returned an empty response.`);
    }

    let parsedJson: unknown;
    try {
      parsedJson = extractJsonObject(content);
    } catch {
      throw new TextParseError(`ABE wizard ${stepLabel} returned invalid JSON.`);
    }

    const parsed = zodSchema.safeParse(parsedJson);
    if (!parsed.success) {
      throw new TextParseError(`ABE wizard ${stepLabel} payload failed schema validation.`);
    }
    return parsed.data;
  }
}

export const abeExtractionService = new AbeExtractionService();

/** @deprecated Use {@link buildAbeSystemPrompt} without context. */
export const ABE_MINIMAL_SYSTEM_PROMPT = buildAbeSystemPrompt(null);
