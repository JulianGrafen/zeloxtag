import type OpenAI from "openai";

import { extractJsonObject } from "@/lib/ocr/json-from-llm";
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
import {
  ABE_CONTEXT_MAX_CHARS,
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
    '- "partCategory" — part family, e.g. "Sonderfahrwerksfedern".',
    '- "partType" — exact part model / type id.',
    '- "physicalMarking" — Kennzeichnung section: how the part is physically marked',
    '  (e.g. "Aufdruck auf den Federwindungen", "Eingegossen", "Typenschild"). CRITICAL.',
    '- "testingOrganization" — Prüforganisation / issuer.',
    '- "requiresPhysicalInspection" — always true (TGA mandates Anbauabnahme).',
    "",
    "VERWENDUNGSBEREICH section (critical):",
    '- "compatibilityTable" — when Verwendungsbereich is tabular, extract ONLY these columns per row:',
    "  Fahrzeughersteller, Fahrzeugtyp, Handelsbezeichnung.",
    "  Do NOT include Achslasten, ABE-Nr, Ausführungen, footnotes, or section headings as cells.",
    '- "verwendungsbereich" — null when compatibilityTable is filled; otherwise a short plain-text summary.',
    '- "auflagen" — one array item per section: heading (ends with ":") plus all following paragraphs until the next heading.',
    "  Example item: \"Berichtigung der Fahrzeugpapiere:\\nDie Berichtigung … zu beantragen.\\nWeitere Festlegungen …\"",
    "  Do NOT split headings and body into separate array entries.",
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
    "- Fill 'compatibilityTable' with vehicle columns only; set 'verwendungsbereich' to null when the table is present.",
    "- Extract ALL Auflagen into 'auflagen', especially those applying to the matched vehicle row.",
    "- If you do not find this exact vehicle, set status to 'not_found' but still extract compatibilityTable and auflagen when readable.",
    "- If the table is too complex or unreadable, set status to 'needs_manual_check'.",
    "When the Verwendungsbereich is tabular, also fill 'compatibilityTable' with headers + rows",
    "(isUserVehicleMatch=false, matchReason=null for every row). Otherwise set compatibilityTable to null.",
    "Return ONLY valid JSON matching the schema.",
  ].join(" ");
}

/**
 * Dedicated § 19 Abs. 3 Teilegutachten extractor — part approval requiring Anbauabnahme.
 */
export class TeilegutachtenExtractionService {
  async extractTeilegutachten(
    markdownText: string,
    options: TeilegutachtenExtractionOptions = {},
  ): Promise<TeilegutachtenExtraction> {
    const vehicleContext = options.vehicleContext ?? null;
    const withContext = Boolean(vehicleContext);

    const windowText = truncateAbeCoverPages(
      markdownText.replace(/\r\n/g, "\n").trim(),
      withContext ? 12 : 4,
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
          "Extract certificateNumber, part fields, Kennzeichnung (physicalMarking),",
          "Verwendungsbereich (verwendungsbereich), Auflagen (auflagen), Technische Daten (technicalDataTable), match status, matchedVehicleRow.",
          "",
          windowText,
        ]
      : [
          "German Teilegutachten § 19 Abs. 3 OCR (Markdown).",
          "Extract certificateNumber, manufacturer, partCategory, partType, physicalMarking (Kennzeichnung),",
          "testingOrganization, verwendungsbereich, auflagen, technicalDataTable.",
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

    if (!withContext) {
      return {
        ...normalized,
        userVehicleMatchStatus: null,
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
}

export const teilegutachtenExtractionService =
  new TeilegutachtenExtractionService();
