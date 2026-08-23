import type OpenAI from "openai";

import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import {
  buildAbeVisionUserMessage,
  type DocumentBytesInput,
} from "@/lib/ocr/prepare-document-for-llm";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";
import { TextParseError } from "@/lib/ocr/parse-error";
import {
  formatAbeVehicleContextLabel,
  type AbeVehicleContext,
} from "@/lib/validations/abeSchema";
import {
  normalizeTeilegutachtenExtraction,
  TEILEGUTACHTEN_JSON_SCHEMA,
  TeilegutachtenLlmPayloadSchema,
  type TeilegutachtenExtraction,
} from "@/lib/validations/teilegutachtenSchema";
import { formatMatchedVehicleRowFromTable } from "@/lib/validations/teilegutachten-compatibility-table";
import {
  ABE_CONTEXT_MAX_CHARS,
  ABE_CONTEXT_MAX_PAGES,
  resolveAbeContextModel,
  truncateAbeCoverPages,
} from "@/services/ocr/AbeExtractionService";
import { tableMatchingService } from "@/services/ocr/TableMatchingService";

export const TEILEGUTACHTEN_MAX_CHARS = ABE_CONTEXT_MAX_CHARS;
const TEILEGUTACHTEN_MAX_TOKENS = 3_200;

export type TeilegutachtenExtractionOptions = {
  /** Garage vehicle for Verwendungsbereich match. */
  vehicleContext?: AbeVehicleContext | null;
  /** Override chat deployment. */
  model?: string;
  maxChars?: number;
};

/**
 * System prompt for German Teilegutachten (§ 19 Abs. 3 StVZO) OCR extraction.
 * Explicitly NOT an ABE and NOT a §21 Einzelabnahme.
 */
export function buildTeilegutachtenSystemPrompt(
  vehicleContext?: AbeVehicleContext | null,
): string {
  const base = [
    "You are a strict data extractor for German automotive approval documents.",
    'Target document: "Teilegutachten" according to § 19 Abs. 3 StVZO (TGA).',
    "This is NOT an ABE (Allgemeine Betriebserlaubnis / KBA-Freigabe).",
    'This is NOT a "Einzelbetriebserlaubnis gem. §21 StVZO" (Einzelabnahme).',
    'Set documentType to exactly "Teilegutachten".',
    "",
    "Extract these fields:",
    '- "certificateNumber" — Gutachtennummer, e.g. "14-00123-CP-GBM".',
    '- "manufacturer" — part manufacturer / Herstellerzeichen.',
    '- "modificationType" — Art der Umrüstung from the document header (verbatim).',
    '- "partCategory" — optional Bauteil / Bezeichnung when separate from Art der Umrüstung.',
    '- "partType" — exact part model / type id.',
    '- "markingType" — Art der Kennzeichnung, verbatim (e.g. "Aufdruck", "Eingegossen"). CRITICAL.',
    '- "markingNumber" — Kennzeichnungsnummer / Nummer on the part (e.g. "e1*47656"). CRITICAL.',
    '- "physicalMarking" — legacy combined Kennzeichnung text; prefer markingType + markingNumber.',
    '- "testingOrganization" — Prüforganisation / issuer.',
    '- "requiresPhysicalInspection" — always true (TGA mandates Anbauabnahme).',
    "",
    "VERWENDUNGSBEREICH section (critical):",
    '- "compatibilityTable" — copy the Verwendungsbereich table 1:1 from the document.',
    "  Preserve ALL original column headers and every cell exactly (Ausführungen, Achslasten, ABE-Nr., footnotes, etc.).",
    "  Do NOT drop columns or summarize cell text.",
    '- "verwendungsbereich" — null when compatibilityTable is filled; otherwise a short plain-text summary.',
    '- "auflagen" — Section IV / "Hinweise und Auflagen".',
    "  When subsections IV.1, IV.2, … exist: ONE array item per subsection with heading line plus full verbatim body (keep numbered lists 1., 2., …).",
    "  Otherwise: ONE array item per colon-heading section with all following paragraphs until the next heading.",
    "  Do NOT include Section III Hinweise here — those belong in ownerNotes.",
    "",
    "OWNER NOTES (critical):",
    '- "ownerNotes" — Section III / "Hinweise für den Fahrzeughalter".',
    "  Copy the full text verbatim from the document (preserve line breaks). Do NOT summarize.",
    "",
    "TECHNISCHE DATEN section (critical):",
    '- "technicalDataTable" — extract Section II / Technische Daten as a structured table.',
    "  Preserve complete cell text (dimensions, part ids, test values).",
    "  Do NOT put technical values into auflagen or Verwendungsbereich.",
    "",
    "Locate the Kennzeichnung / Markierung section carefully — police checks verify",
    "that the installed part matches this physical marking during Anbauabnahme.",
  ];

  if (!vehicleContext) {
    return [
      ...base,
      "",
      "No target vehicle was provided.",
      "Still extract compatibilityTable (vehicle columns only) and auflagen when present.",
      "Set userVehicleMatchStatus and matchedVehicleRow to null.",
      "Return ONLY valid JSON matching the schema.",
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
    ...base,
    "",
    `TARGET VEHICLE CHECK: The user drives a ${target}.${extras ? ` ${extras}.` : ""}`,
    "Scan the 'Verwendungsbereich' (compatibility table) specifically for THIS vehicle.",
    "- If you find a match, set 'userVehicleMatchStatus' to 'verified' and extract the matched row into 'matchedVehicleRow' as 'Hersteller · Typ · Modell'.",
    "- Fill 'compatibilityTable' with the full Verwendungsbereich table (all columns, verbatim cells); set 'verwendungsbereich' to null when the table is present.",
    "- Extract ALL Auflagen into 'auflagen', especially those applying to the matched vehicle row.",
    "- If you do not find this exact vehicle, set status to 'not_found' but still extract compatibilityTable and auflagen when readable.",
    "- If the table is too complex or unreadable, set status to 'needs_manual_check'.",
    "When the Verwendungsbereich is tabular, fill 'compatibilityTable' with all headers + rows verbatim",
    "(isUserVehicleMatch=false, matchReason=null for every row). Otherwise set compatibilityTable to null.",
    "Return ONLY valid JSON matching the schema.",
  ].join(" ");
}

/**
 * Dedicated § 19 Abs. 3 Teilegutachten extractor — part approval requiring Anbauabnahme.
 */
export class TeilegutachtenExtractionService {
  async extractFromDocument(
    input: DocumentBytesInput,
    options: TeilegutachtenExtractionOptions = {},
  ): Promise<TeilegutachtenExtraction> {
    const vehicleContext = options.vehicleContext ?? null;
    const withContext = Boolean(vehicleContext);
    const model = options.model?.trim() || resolveAbeContextModel();

    let client: OpenAI;
    let resolvedModel: string;
    try {
      ({ client, model: resolvedModel } = getOcrLlmClient({ model }));
    } catch (error) {
      throw new TextParseError(
        error instanceof Error ? error.message : "LLM client is not configured.",
      );
    }

    const systemPrompt = buildTeilegutachtenSystemPrompt(vehicleContext);
    const instructionLines = withContext
      ? [
          "German Teilegutachten § 19 Abs. 3 document.",
          `TARGET VEHICLE: ${formatAbeVehicleContextLabel(vehicleContext!)}`,
          "Extract certificateNumber, part fields, markingType, markingNumber,",
          "Verwendungsbereich (compatibilityTable), Auflagen, ownerNotes, technicalDataTable, match status.",
        ]
      : [
          "German Teilegutachten § 19 Abs. 3 document.",
          "Extract certificateNumber, manufacturer, modificationType, partCategory, partType,",
          "markingType, markingNumber, testingOrganization, compatibilityTable, auflagen, ownerNotes, technicalDataTable.",
          "Set userVehicleMatchStatus and matchedVehicleRow to null.",
        ];

    const userContent = await buildAbeVisionUserMessage(instructionLines, input, {
      maxPdfPages: 12,
    });

    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await client.chat.completions.create({
        model: resolvedModel,
        max_completion_tokens: TEILEGUTACHTEN_MAX_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: TEILEGUTACHTEN_JSON_SCHEMA,
        },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "LLM request failed.";
      throw new TextParseError(`Teilegutachten extract failed: ${message}`);
    }

    return this.normalizeExtracted(completion, withContext, vehicleContext);
  }

  async extractTeilegutachten(
    markdownText: string,
    options: TeilegutachtenExtractionOptions = {},
  ): Promise<TeilegutachtenExtraction> {
    const vehicleContext = options.vehicleContext ?? null;
    const withContext = Boolean(vehicleContext);

    const windowText = truncateAbeCoverPages(
      markdownText.replace(/\r\n/g, "\n").trim(),
      ABE_CONTEXT_MAX_PAGES,
      options.maxChars ?? TEILEGUTACHTEN_MAX_CHARS,
    );

    if (windowText.length < 8) {
      throw new TextParseError(
        "OCR-Text ist zu kurz für die Teilegutachten-Extraktion.",
      );
    }

    const model = options.model?.trim() || resolveAbeContextModel();

    let client: OpenAI;
    let resolvedModel: string;
    try {
      ({ client, model: resolvedModel } = getOcrLlmClient({ model }));
    } catch (error) {
      throw new TextParseError(
        error instanceof Error ? error.message : "LLM client is not configured.",
      );
    }

    const systemPrompt = buildTeilegutachtenSystemPrompt(vehicleContext);
    const userLines = withContext
      ? [
          "German Teilegutachten § 19 Abs. 3 OCR (Markdown).",
          `TARGET VEHICLE: ${formatAbeVehicleContextLabel(vehicleContext!)}`,
          "Extract certificateNumber, part fields, markingType (Art der Kennzeichnung), markingNumber (Kennzeichnungsnummer),",
          "Verwendungsbereich (compatibilityTable / verwendungsbereich), Auflagen (auflagen), Hinweise für den Fahrzeughalter (ownerNotes), Technische Daten (technicalDataTable), match status, matchedVehicleRow.",
          "",
          windowText,
        ]
      : [
          "German Teilegutachten § 19 Abs. 3 OCR (Markdown).",
          "Extract certificateNumber, manufacturer, modificationType (Art der Umrüstung), partCategory, partType,",
          "markingType (Art der Kennzeichnung), markingNumber (Kennzeichnungsnummer), testingOrganization,",
          "compatibilityTable, verwendungsbereich, auflagen, ownerNotes, technicalDataTable.",
          "Set userVehicleMatchStatus and matchedVehicleRow to null.",
          "",
          windowText,
        ];

    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await client.chat.completions.create({
        model: resolvedModel,
        max_completion_tokens: TEILEGUTACHTEN_MAX_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: TEILEGUTACHTEN_JSON_SCHEMA,
        },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userLines.join("\n") },
        ],
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "LLM request failed.";
      throw new TextParseError(`Teilegutachten extract failed: ${message}`);
    }

    return this.normalizeExtracted(completion, withContext, vehicleContext);
  }

  private normalizeExtracted(
    completion: OpenAI.Chat.Completions.ChatCompletion,
    withContext: boolean,
    vehicleContext: AbeVehicleContext | null,
  ): TeilegutachtenExtraction {
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new TextParseError(
        "Teilegutachten extract returned an empty response.",
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = extractJsonObject(content);
    } catch {
      throw new TextParseError(
        "Teilegutachten extract returned invalid JSON.",
      );
    }

    const parsed = TeilegutachtenLlmPayloadSchema.safeParse(parsedJson);
    if (!parsed.success) {
      throw new TextParseError(
        "Teilegutachten extract payload failed schema validation.",
      );
    }

    const normalized = normalizeTeilegutachtenExtraction(parsed.data);
    const extracted: TeilegutachtenExtraction = normalized.compatibilityTable
      ? { ...normalized, verwendungsbereich: null }
      : normalized;

    if (!withContext) {
      const table = extracted.compatibilityTable
        ? tableMatchingService.matchTable(extracted.compatibilityTable, null)
            .table
        : null;

      return {
        ...extracted,
        userVehicleMatchStatus: null,
        matchedVehicleRow: formatMatchedVehicleRowFromTable(table),
        compatibilityTable: table,
      };
    }

    if (!extracted.compatibilityTable) {
      return extracted;
    }

    const { table: matchedTable, matchedRowIds } =
      tableMatchingService.matchTable(
        extracted.compatibilityTable,
        vehicleContext,
      );

    const matchedRow = matchedTable.rows.find((row) => row.isUserVehicleMatch);
    const shouldPromoteMatch =
      matchedRowIds.length > 0 &&
      extracted.userVehicleMatchStatus !== "needs_manual_check";
    const matchedVehicleRow =
      (shouldPromoteMatch
        ? formatMatchedVehicleRowFromTable(matchedTable) ??
          matchedRow?.cells.filter(Boolean).join(" · ") ??
          extracted.matchedVehicleRow
        : extracted.matchedVehicleRow) ??
      formatMatchedVehicleRowFromTable(matchedTable);

    return {
      ...extracted,
      compatibilityTable: matchedTable,
      userVehicleMatchStatus: shouldPromoteMatch
        ? "verified"
        : extracted.userVehicleMatchStatus,
      matchedVehicleRow,
    };
  }
}

export const teilegutachtenExtractionService =
  new TeilegutachtenExtractionService();
