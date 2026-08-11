import "server-only";

import type OpenAI from "openai";

import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";
import {
  ABE_TABLE_EXTRACTION_JSON_SCHEMA,
  ABE_TABLE_EXTRACTION_SYSTEM_PROMPT,
  AbeTableExtractionSchema,
  emptyAbeTableExtraction,
  normalizeAbeTableExtraction,
} from "@/lib/validations/abeTableExtractionSchemas";
import { resolveAbeContextModel } from "@/services/ocr/AbeExtractionService";
import type { AbeTableExtraction } from "@/types/abe";

import {
  ingestAbeDocument,
  type IngestedPage,
  type IngestionInput,
} from "./IngestionService";

const TABLE_VISION_MAX_TOKENS = 4_096;

export type TableExtractionResult = {
  extraction: AbeTableExtraction;
  pageCount: number;
  model: string;
};

function buildTableImageUserContent(
  pages: IngestedPage[],
): OpenAI.Chat.Completions.ChatCompletionContentPart[] {
  const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text",
      text:
        "Extract the German ABE / Gutachten vehicle compatibility table from the attached image(s). " +
        "Respect merged cells in the Handelsbezeichnung column. Return only the JSON object.",
    },
  ];

  for (const page of pages) {
    parts.push({
      type: "text",
      text: `Table image: ${page.sourceLabel}`,
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

export class TableExtractorService {
  constructor(private readonly model = resolveAbeContextModel()) {}

  async extractFromPages(pages: IngestedPage[]): Promise<AbeTableExtraction> {
    if (pages.length === 0) return emptyAbeTableExtraction();

    const { client } = getOcrLlmClient({ model: this.model });

    try {
      const completion = await client.chat.completions.create({
        model: this.model,
        temperature: 0,
        max_tokens: TABLE_VISION_MAX_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: ABE_TABLE_EXTRACTION_JSON_SCHEMA,
        },
        messages: [
          { role: "system", content: ABE_TABLE_EXTRACTION_SYSTEM_PROMPT },
          { role: "user", content: buildTableImageUserContent(pages) },
        ],
      });

      const content = completion.choices[0]?.message?.content?.trim();
      if (!content) return emptyAbeTableExtraction();

      const parsed = AbeTableExtractionSchema.safeParse(
        extractJsonObject(content),
      );
      if (!parsed.success) return emptyAbeTableExtraction();

      return normalizeAbeTableExtraction(parsed.data);
    } catch {
      return emptyAbeTableExtraction();
    }
  }

  async extract(input: IngestionInput): Promise<TableExtractionResult> {
    const pages = await ingestAbeDocument(input);
    const extraction = await this.extractFromPages(pages);

    return {
      extraction,
      pageCount: pages.length,
      model: this.model,
    };
  }
}

export const abeTableExtractorService = new TableExtractorService();
