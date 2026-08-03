import type OpenAI from "openai";

import { getInvoiceLlmClient } from "./llm-client";
import { INVOICE_OCR_JSON_SCHEMA, isInvoiceOcrFields, normalizeOcrFields } from "./schema";
import type { InvoiceOcrFields } from "./types";

const OCR_MAX_TOKENS = 200;

export class OcrExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OcrExtractionError";
  }
}

/**
 * Cost-optimized vision OCR via LLM + strict JSON schema.
 * Uses low image detail and a tiny max_tokens budget.
 */
export async function extractInvoiceFromImage(input: {
  bytes: Buffer;
  mimeType: string;
}): Promise<InvoiceOcrFields> {
  let client: OpenAI;
  let model: string;
  try {
    ({ client, model } = getInvoiceLlmClient());
  } catch (error) {
    throw new OcrExtractionError(
      error instanceof Error ? error.message : "LLM client is not configured.",
    );
  }

  const dataUrl = `data:${input.mimeType};base64,${input.bytes.toString("base64")}`;

  let completion: OpenAI.Chat.Completions.ChatCompletion;
  try {
    completion = await client.chat.completions.create({
      model,
      max_completion_tokens: OCR_MAX_TOKENS,
      response_format: {
        type: "json_schema",
        json_schema: INVOICE_OCR_JSON_SCHEMA,
      },
      messages: [
        {
          role: "system",
          content:
            "Extract invoice fields from the image. Return only the JSON schema fields. " +
            "If a value is unreadable, use null for date/amount. Prefer the invoice total (Brutto/Gesamt).",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Read this vehicle invoice / workshop receipt and extract vendor, date, amount, category.",
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "low",
              },
            },
          ],
        },
      ],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "OpenAI request failed.";
    throw new OcrExtractionError(`OCR request failed: ${message}`);
  }

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new OcrExtractionError("OCR returned an empty response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new OcrExtractionError("OCR returned invalid JSON.");
  }

  if (!isInvoiceOcrFields(parsed)) {
    throw new OcrExtractionError("OCR payload failed schema validation.");
  }

  return normalizeOcrFields(parsed);
}
