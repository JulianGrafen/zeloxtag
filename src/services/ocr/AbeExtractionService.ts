import type OpenAI from "openai";

import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import {
  buildDocumentUserMessage,
  type DocumentBytesInput,
} from "@/lib/ocr/llm-document-content";
import {
  buildVisionUserMessage,
  prepareAbeOcrInput,
} from "@/lib/ocr/prepare-document-for-llm";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";
import {
  DEFAULT_PARSE_MODEL,
  resolveParseModel,
} from "@/lib/ocr/model-routing";
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
  type AbeWizardVehiclesRaw,
} from "@/lib/validations/abeWizardSchemas";
import {
  mergeAbeVehicleMatchRows,
  parseAbeVehicleRows,
} from "@/lib/ocr/abe-wizard-vehicle-normalize";
import { normalizeAbeWizardCoverExtraction } from "@/lib/ocr/abe-wizard-cover-normalize";
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

/** Economy deployment for ABE cover, Stammdaten, Kennzeichnung, Auflagen, etc. */
export function resolveAbeContextModel(): string {
  return (
    process.env.FOUNDRY_MODEL_ABE?.trim() || resolveParseModel("abe")
  );
}

/** GPT-5.4 (or override) — reserved for Verwendungsbereich / Fahrzeugtabelle vision only. */
export function resolveAbeTableExtractionModel(): string {
  return (
    process.env.FOUNDRY_MODEL_ABE_TABLE?.trim() ||
    process.env.FOUNDRY_MODEL_ABE_CONTEXT?.trim() ||
    "gpt-5.4"
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
 * ABE extractor — cover-only (economy) or context-aware OCR window (economy).
 * Dedicated table vision uses {@link resolveAbeTableExtractionModel} elsewhere.
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
        "You extract German ABE manufacturer cover pages for any approved part type (wheels, spoilers, wheel spacers, body kits, etc.).",
        "Extract kbaNumber when a KBA field is visible (digits only, no 'KBA' prefix).",
        "Extract approvalNumber (Genehmigungsnummer) from Gutachten-Nr., Genehmigungsnummer, ABE … NR., Rad-Gutachten-Nr., or similar labels.",
        "When KBA is visible, extract BOTH kbaNumber and approvalNumber.",
        "When KBA is NOT visible, still extract approvalNumber if any approval reference is printed.",
        "Also extract manufacturer, designType (typ/design/bezeichnung), dimensions (maße/größe/abmessungen), articleNumbers when visible.",
        "designType: join multiple lines with ' / '. articleNumbers: every printed part/article code as separate entries.",
        "Return ONLY valid JSON matching the schema.",
      ],
      [
        "Extract the manufacturer cover page from this photograph only.",
        "Part type may be wheels, spoiler, spacers, or other ABE component — read labels on THIS page only.",
        "Look for KBA, Genehmigungsnummer, Typ/Design, Maße, Artikel-Nr.",
      ],
      ABE_WIZARD_COVER_JSON_SCHEMA,
      AbeWizardCoverSchema,
      600,
      "cover",
      { model: resolveAbeContextModel() },
    );
    return normalizeAbeWizardCoverExtraction(raw);
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
        "Fields: abeNumber (incl. suffix after *), abeHolder (Inhaber / Auftraggeber), manufacturer (Hersteller / Herstellerzeichen), testingOrganization.",
        "If the label is combined ('Inhaber der ABE und Hersteller:'), set both abeHolder and manufacturer.",
        'Map "Auftraggeber" to abeHolder when no separate Inhaber der ABE label is shown.',
        "Return ONLY valid JSON matching the schema.",
      ],
      [
        "Extract the main ABE page from this photograph only.",
        "Look for 'Nummer der ABE:', 'Inhaber der ABE', 'Auftraggeber', 'Hersteller', 'Herstellerzeichen', and the issuing authority at the top.",
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
   * Uses {@link resolveAbeTableExtractionModel} (GPT-5.4 by default).
   */
  async extractVehiclesFromDocument(
    input: DocumentBytesInput,
  ): Promise<AbeWizardVehiclesExtraction> {
    const vehicleMatches = await this.extractVehicleRowsWithRetry(input);
    return { vehicleMatches };
  }

  private async extractVehicleRowsWithRetry(
    input: DocumentBytesInput,
  ): Promise<AbeWizardVehiclesExtraction["vehicleMatches"]> {
    const primary = await this.runVehicleTableWizardStep(input, "primary");
    let vehicleMatches = parseAbeVehicleRows(primary.vehicleMatches);
    if (vehicleMatches.length > 1) return vehicleMatches;

    const retry = await this.runVehicleTableWizardStep(input, "retry");
    const retryMatches = parseAbeVehicleRows(retry.vehicleMatches);
    if (retryMatches.length > vehicleMatches.length) {
      return retryMatches;
    }

    return mergeAbeVehicleMatchRows(vehicleMatches, retryMatches);
  }

  private runVehicleTableWizardStep(
    input: DocumentBytesInput,
    pass: "primary" | "retry",
  ): Promise<AbeWizardVehiclesRaw> {
    const isRetry = pass === "retry";
    return this.runWizardStep<AbeWizardVehiclesRaw>(
      input,
      [
        AbeExtractionService.WIZARD_IMAGE_ONLY_GUARD,
        "You extract German ABE Fahrzeug- und Auflagen-Tabelle pages.",
        "Create one vehicleMatches entry for every visible table row in the photograph.",
        isRetry
          ? "The photograph contains a grid-style compatibility table — do NOT return an empty array or only the first row."
          : "Only return vehicleMatches: [] when the image clearly has no grid table at all (e.g. cover letter text only).",
        "CRITICAL — each row belongs to a Verkaufsbezeichnung section header above the row group.",
        "Copy the Verkaufsbezeichnung header text onto EVERY row in that group — never leave it empty on data rows.",
        "If the header appears once above the table, repeat that same text on each extracted row.",
        "NEVER put Fahrzeugtyp codes into verkaufsbezeichnung.",
        "Column mapping:",
        "- verkaufsbezeichnung: section header label for this row's group (same text for all rows under one header).",
        "- fahrzeugtyp: Fahrzeugtyp column cell for this row only.",
        "- typeApproval: Betriebserlaubnis cell verbatim.",
        "- driveType: drive-type word in Auflagen (Allradantrieb / Heckantrieb / Frontantrieb), else null.",
        "- tireSizes: tyre sizes from Reifen column if present; empty array when column is missing (e.g. spoiler, spacer).",
        "- auflagenCodes: EVERY short condition code from this row's Auflagen columns (reifenbezogen AND Hinweise) — never from other rows. Letter suffixes stay letters (22B not 228).",
        "Read digits 3 and 8 carefully in Fahrzeugtyp codes — common OCR confusion (346K not 846K).",
        'When one table line lists multiple Fahrzeugtyp codes (e.g. "346C, 346R"), emit ONE row PER code.',
        "Do not merge rows. Do not skip rows. Do not add rows that are not visible.",
        "Return ONLY valid JSON matching the schema.",
      ],
      isRetry
        ? [
            "This image shows a Verwendungs- or Fahrzeug-Tabelle (wheels, spoiler, spacers, etc.).",
            "Typical columns: Fahrzeugtyp, Betriebserlaubnis, kW, Reifen (optional), Auflagen.",
            "Look for the bold 'Verkaufsbezeichnung:' header above each table block.",
            "Extract EVERY visible data row from ALL table blocks on this page.",
            "Repeat the Verkaufsbezeichnung text on each row even when it only appears once above the group.",
          ]
        : [
            "Extract every visible row from the Fahrzeug- und Auflagen-Tabelle in this photograph.",
            "The page must show a grid table — not the ABE cover or plain legal text.",
            "Read the Verkaufsbezeichnung header above each group and repeat it on every row in that group.",
            "Typical columns: Fahrzeugtyp | Betriebserlaubnis | kW | Reifen (if applicable) | Auflagen.",
            "Use only text you can read on this image.",
          ],
      ABE_WIZARD_VEHICLES_JSON_SCHEMA,
      AbeWizardVehiclesSchema,
      4000,
      isRetry ? "vehicles-retry" : "vehicles",
      { model: resolveAbeTableExtractionModel() },
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

    const prepared = await prepareAbeOcrInput(input);
    const userContent = buildVisionUserMessage(instructionLines, prepared);

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
