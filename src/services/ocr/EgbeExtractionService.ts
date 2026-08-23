import type OpenAI from "openai";

import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import {
  buildAbeVisionUserMessage,
  type DocumentBytesInput,
} from "@/lib/ocr/prepare-document-for-llm";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";
import { resolveParseModel } from "@/lib/ocr/model-routing";
import { TextParseError } from "@/lib/ocr/parse-error";
import { EGBESchema, type EGBE } from "@/lib/validations/documentSchemas";

const EGBE_MAX_TOKENS = 600;

export const EGBE_JSON_SCHEMA = {
  name: "egbe_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["eMark", "componentGroup"],
    properties: {
      eMark: {
        type: "string",
        description: 'ECE type approval mark, e.g. "e1*47656*00001*00".',
      },
      componentGroup: {
        type: "string",
        description: "Bauteilgruppe / Geräteart / Genehmigungsgegenstand.",
      },
    },
  },
} as const;

export type EgbeExtractionOptions = {
  model?: string;
};

export class EgbeExtractionService {
  async extractFromDocument(
    input: DocumentBytesInput,
    options: EgbeExtractionOptions = {},
  ): Promise<EGBE> {
    const model = options.model?.trim() || resolveParseModel("abe");

    let client: OpenAI;
    let resolvedModel: string;
    try {
      ({ client, model: resolvedModel } = getOcrLlmClient({ model }));
    } catch (error) {
      throw new TextParseError(
        error instanceof Error ? error.message : "LLM client is not configured.",
      );
    }

    const userContent = await buildAbeVisionUserMessage(
      [
        "German EG/ECE type approval document (E-Prüfzeichen).",
        "Extract the e-mark (eMark) and component group (componentGroup).",
      ],
      input,
      { maxPdfPages: 4 },
    );

    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await client.chat.completions.create({
        model: resolvedModel,
        max_completion_tokens: EGBE_MAX_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: EGBE_JSON_SCHEMA,
        },
        messages: [
          {
            role: "system",
            content:
              "Extract EG/ECE approval e-mark and component group from the document. Return ONLY valid JSON.",
          },
          { role: "user", content: userContent },
        ],
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "LLM request failed.";
      throw new TextParseError(`EG-BE extract failed: ${message}`);
    }

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new TextParseError("EG-BE extract returned an empty response.");
    }

    let parsedJson: unknown;
    try {
      parsedJson = extractJsonObject(content);
    } catch {
      throw new TextParseError("EG-BE extract returned invalid JSON.");
    }

    const parsed = EGBESchema.safeParse(parsedJson);
    if (!parsed.success) {
      throw new TextParseError(
        "EG-BE extract payload failed schema validation.",
      );
    }

    return parsed.data;
  }
}

export const egbeExtractionService = new EgbeExtractionService();
