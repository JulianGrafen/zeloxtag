import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";
import { resolveInvoiceParseModel } from "@/lib/ocr/model-routing";
import { TextParseError } from "@/lib/ocr/parse-error";

import type { IModelEngine, ModelParseInput } from "@/services/invoice/interfaces";

const DEFAULT_MAX_TOKENS = 3_600;

/**
 * Text-only LLM engine via OpenAI SDK (Azure AI Foundry or direct OpenAI).
 * Avoids vision tokens — parses layout Markdown only.
 */
export class OpenAIModelEngine implements IModelEngine {
  constructor(private readonly defaultModel?: string) {}

  async parseStructuredJson<T>(input: ModelParseInput): Promise<T> {
    const routedModel =
      input.model?.trim() ||
      this.defaultModel?.trim() ||
      resolveInvoiceParseModel();

    let client;
    let model: string;
    try {
      ({ client, model } = getOcrLlmClient({ model: routedModel }));
    } catch (error) {
      throw new TextParseError(
        error instanceof Error ? error.message : "LLM client is not configured.",
      );
    }

    if (/^zeloxta/i.test(model)) {
      model = resolveInvoiceParseModel();
    }

    let completion;
    try {
      completion = await client.chat.completions.create({
        model,
        max_completion_tokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
        response_format: input.jsonSchema
          ? {
              type: "json_schema",
              json_schema: input.jsonSchema,
            }
          : { type: "json_object" },
        messages: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.userContent },
        ],
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "LLM request failed.";
      throw new TextParseError(`Hybrid invoice LLM parse failed: ${message}`);
    }

    const content = completion.choices[0]?.message?.content;
    if (!content?.trim()) {
      throw new TextParseError("Hybrid invoice LLM returned an empty response.");
    }

    try {
      return extractJsonObject(content) as T;
    } catch {
      throw new TextParseError("Hybrid invoice LLM returned invalid JSON.");
    }
  }
}
