/**
 * Vision-LLM ABE extraction — provider interface keeps the UI decoupled
 * from OpenAI / Azure Foundry / future Anthropic adapters.
 */

import type OpenAI from "openai";

import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";
import {
  ABE_VISION_EXTRACTION_JSON_SCHEMA,
  ABE_VISION_SYSTEM_PROMPT,
  AbeVisionExtractionSchema,
  emptyAbeVisionExtraction,
  normalizeAbeVisionExtraction,
  type AbeVisionExtraction,
} from "@/lib/validations/abeVisionExtractionSchemas";
import { resolveAbeContextModel } from "@/services/ocr/AbeExtractionService";

import {
  ingestAbeDocument,
  type IngestedPage,
  type IngestionInput,
} from "./IngestionService";

const VISION_MAX_TOKENS = 900;

export type VisionExtractionResult = {
  extraction: AbeVisionExtraction;
  pageCount: number;
  model: string;
};

/** Swappable vision backend — implement for OpenAI, Anthropic, etc. */
export interface VisionExtractionProvider {
  extractFromPages(pages: IngestedPage[]): Promise<AbeVisionExtraction>;
}

function buildMultiImageUserContent(
  pages: IngestedPage[],
): OpenAI.Chat.Completions.ChatCompletionContentPart[] {
  const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text",
      text:
        "Analyze all attached ABE / Gutachten page images together. " +
        "Return only the JSON object described in the system prompt.",
    },
  ];

  for (const page of pages) {
    parts.push({
      type: "text",
      text: `Page: ${page.sourceLabel}`,
    });
    parts.push({
      type: "image_url",
      image_url: {
        url: `data:${page.contentType};base64,${page.bytes.toString("base64")}`,
        detail: "high",
      },
    });
  }

  return parts;
}

export class OpenAiVisionExtractionProvider implements VisionExtractionProvider {
  constructor(private readonly model = resolveAbeContextModel()) {}

  async extractFromPages(pages: IngestedPage[]): Promise<AbeVisionExtraction> {
    if (pages.length === 0) return emptyAbeVisionExtraction();

    const { client } = getOcrLlmClient({ model: this.model });

    try {
      const completion = await client.chat.completions.create({
        model: this.model,
        temperature: 0,
        max_tokens: VISION_MAX_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: ABE_VISION_EXTRACTION_JSON_SCHEMA,
        },
        messages: [
          { role: "system", content: ABE_VISION_SYSTEM_PROMPT },
          { role: "user", content: buildMultiImageUserContent(pages) },
        ],
      });

      const content = completion.choices[0]?.message?.content?.trim();
      if (!content) return emptyAbeVisionExtraction();

      const parsed = AbeVisionExtractionSchema.safeParse(
        extractJsonObject(content),
      );
      if (!parsed.success) return emptyAbeVisionExtraction();

      return normalizeAbeVisionExtraction(parsed.data);
    } catch {
      return emptyAbeVisionExtraction();
    }
  }
}

export class AbeVisionExtractor {
  constructor(
    private readonly provider: VisionExtractionProvider = new OpenAiVisionExtractionProvider(),
  ) {}

  async extract(input: IngestionInput): Promise<VisionExtractionResult> {
    const pages = await ingestAbeDocument(input);
    const model =
      this.provider instanceof OpenAiVisionExtractionProvider
        ? resolveAbeContextModel()
        : "vision-provider";

    const extraction = await this.provider.extractFromPages(pages);

    return {
      extraction,
      pageCount: pages.length,
      model,
    };
  }
}

export const abeVisionExtractor = new AbeVisionExtractor();
