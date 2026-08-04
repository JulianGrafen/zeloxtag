import type OpenAI from "openai";

import {
  budgetAbeOcrText,
  extractAbeConditionsFromText,
  preferAbeConditions,
  preferAbeManufacturer,
  resolveAbeFields,
  stripAbeFitmentSections,
} from "@/lib/ocr/abe-from-text";
import {
  ABE_PART_CATEGORY_LABELS,
  ABE_CORE_PARSE_JSON_SCHEMA,
  abeCoreParseSchema,
  normalizeAbeCoreParseResult,
  type AbeCoreParseResult,
} from "@/lib/ocr/abe-parse-schema";
import {
  ABE_SYSTEM_PROMPT,
  ABE_USER_PROMPT_LINES,
} from "@/lib/ocr/abe-parse-prompts";
import {
  extractAbeTechnicalSpecsFromText,
  preferAbeTechnicalSpecs,
} from "@/lib/ocr/abe-technical-specs-from-text";
import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";
import { resolveParseModel } from "@/lib/ocr/model-routing";
import type { OcrDocumentType } from "@/lib/ocr/ocr-types";
import { TextParseError } from "@/lib/ocr/parse-error";
import { resolveAbePartName } from "@/lib/ocr/part-from-text";
import {
  normalizeTextParseResult,
  type InvoiceTextParseResult,
} from "@/lib/ocr/text-parse-schema";

const PARSE_MAX_TOKENS = 2_200;
/** Larger budget — Auflagen sit late in multi-page ABEs. */
const MAX_RAW_TEXT_CHARS = 48_000;

function prepareAbeTextForLlm(rawText: string): string {
  const prepared = stripAbeFitmentSections(rawText)
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return budgetAbeOcrText(prepared, MAX_RAW_TEXT_CHARS);
}

/**
 * ABE / Teilegutachten-only LLM parse service.
 * Does not extract invoice line items / amounts — use {@link InvoiceParseService}.
 */
export type AbeParseOptions = {
  /** Routing type — abe (default) or tuev both use the economy model. */
  documentType?: Extract<OcrDocumentType, "abe" | "tuev">;
  model?: string;
};

export class AbeParseService {
  /**
   * Specialized ABE extraction: core metadata + fully worded Auflagen.
   * LLM result is merged with heuristic Auflagen / Maße fallbacks.
   * Uses the cost-efficient nano deployment via model routing.
   */
  async parseFromText(
    rawText: string,
    options: AbeParseOptions = {},
  ): Promise<AbeCoreParseResult> {
    const text = prepareAbeTextForLlm(rawText);
    const heuristicConditions =
      extractAbeConditionsFromText(text) ??
      extractAbeConditionsFromText(rawText);
    const heuristicTechnicalSpecs =
      extractAbeTechnicalSpecsFromText(text) ??
      extractAbeTechnicalSpecsFromText(rawText);

    if (text.length < 8) {
      throw new TextParseError(
        "OCR-Text ist zu kurz oder enthält keine lesbare ABE-Information.",
      );
    }

    const heuristicManufacturer = preferAbeManufacturer(null, text);

    const heuristicOnlyPayload = (): AbeCoreParseResult =>
      normalizeAbeCoreParseResult({
        kbaNumber: null,
        manufacturer: heuristicManufacturer,
        partCategory: "other",
        partType: null,
        date: null,
        conditions: heuristicConditions,
        technicalSpecs: heuristicTechnicalSpecs,
      });

    const hasHeuristicFallback = Boolean(
      heuristicConditions?.length ||
        heuristicTechnicalSpecs?.length ||
        heuristicManufacturer,
    );

    const routedModel =
      options.model ??
      resolveParseModel(options.documentType ?? "abe");

    let client: OpenAI;
    let model: string;
    try {
      ({ client, model } = getOcrLlmClient({ model: routedModel }));
    } catch (error) {
      throw new TextParseError(
        error instanceof Error ? error.message : "LLM client is not configured.",
      );
    }

    if (/^zeloxta/i.test(model)) {
      model = resolveParseModel("abe");
    }

    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await client.chat.completions.create({
        model,
        max_completion_tokens: PARSE_MAX_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: ABE_CORE_PARSE_JSON_SCHEMA,
        },
        messages: [
          { role: "system", content: ABE_SYSTEM_PROMPT },
          {
            role: "user",
            content: [...ABE_USER_PROMPT_LINES, "", text].join("\n"),
          },
        ],
      });
    } catch (error) {
      if (hasHeuristicFallback) return heuristicOnlyPayload();
      const message =
        error instanceof Error ? error.message : "LLM request failed.";
      throw new TextParseError(`ABE parse request failed: ${message}`);
    }

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      if (hasHeuristicFallback) return heuristicOnlyPayload();
      throw new TextParseError("ABE parse returned an empty response.");
    }

    let parsedJson: unknown;
    try {
      parsedJson = extractJsonObject(content);
    } catch {
      if (hasHeuristicFallback) return heuristicOnlyPayload();
      throw new TextParseError("ABE parse returned invalid JSON.");
    }

    const parsed = abeCoreParseSchema.safeParse(parsedJson);
    if (!parsed.success) {
      if (hasHeuristicFallback) return heuristicOnlyPayload();
      throw new TextParseError("ABE parse payload failed schema validation.");
    }

    const normalized = normalizeAbeCoreParseResult(parsed.data);
    return {
      ...normalized,
      manufacturer: preferAbeManufacturer(normalized.manufacturer, text),
      date: null,
      conditions: preferAbeConditions(
        normalized.conditions,
        heuristicConditions,
      ),
      technicalSpecs: preferAbeTechnicalSpecs(
        normalized.technicalSpecs,
        heuristicTechnicalSpecs,
      ),
    };
  }

  /**
   * Map ABE core fields into the analyze API shape used by InvoiceUploader.
   * Invoice monetary fields stay null.
   */
  toAnalyzeFields(
    abe: AbeCoreParseResult,
    rawText: string,
  ): InvoiceTextParseResult {
    const partName = resolveAbePartName({
      structuredPart: abe.partType,
      rawText,
    });
    const resolved = resolveAbeFields({
      structuredKba: abe.kbaNumber,
      structuredApprovals: null,
      rawText,
    });

    return normalizeTextParseResult({
      vendor: partName,
      date: null,
      amount: null,
      category: "abe",
      summary: partName?.slice(0, 80) ?? null,
      lineItems: null,
      kbaNumber: resolved.kbaNumber,
      vehicleApprovals: resolved.vehicleApprovals,
      authority: null,
      conditions: preferAbeConditions(
        abe.conditions,
        extractAbeConditionsFromText(rawText),
      ),
      partCategory: ABE_PART_CATEGORY_LABELS[abe.partCategory],
      notes: null,
      manufacturer: preferAbeManufacturer(abe.manufacturer, rawText),
      invoiceNumber: null,
      mileageKm: null,
    });
  }
}

export const abeParseService = new AbeParseService();
