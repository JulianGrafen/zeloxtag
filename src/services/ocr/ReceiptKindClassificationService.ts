import "server-only";

import { z } from "zod";

import {
  inferReceiptKindFromText,
  normalizeReceiptKindResult,
  type ReceiptKindResult,
} from "@/lib/receipt/receipt-kind";
import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";

const llmKindSchema = z.object({
  kind: z.enum(["fuel_receipt", "workshop_invoice", "uncertain"]),
  confidence: z.number().min(0).max(1).optional(),
});

const CLASSIFY_JSON_SCHEMA = {
  name: "receipt_kind_classification",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["kind", "confidence"],
    properties: {
      kind: {
        type: "string",
        enum: ["fuel_receipt", "workshop_invoice", "uncertain"],
      },
      confidence: {
        type: "number",
        description: "0-1 confidence in the classification.",
      },
    },
  },
} as const;

const SYSTEM_PROMPT =
  "Classify German vehicle-related receipts from a photo. " +
  "Return JSON only. fuel_receipt = gas station (liters, €/L, pump, Diesel/Super). " +
  "workshop_invoice = garage invoice with labor/parts, net/gross, invoice number. " +
  "uncertain = cannot tell. Do not guess.";

export async function classifyReceiptKindFromImage(input: {
  bytes: Buffer;
  mimeType: string;
}): Promise<ReceiptKindResult> {
  try {
    const { client, model } = getOcrLlmClient();
    const dataUrl = `data:${input.mimeType};base64=${input.bytes.toString("base64")}`;

    const completion = await client.chat.completions.create({
      model,
      max_completion_tokens: 120,
      response_format: {
        type: "json_schema",
        json_schema: CLASSIFY_JSON_SCHEMA,
      },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Is this a fuel station receipt or a workshop invoice?",
            },
            {
              type: "image_url",
              image_url: { url: dataUrl, detail: "low" },
            },
          ],
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content?.trim()) {
      return { kind: "uncertain", confidence: 0 };
    }

    const parsed = llmKindSchema.safeParse(extractJsonObject(content));
    if (!parsed.success) {
      return { kind: "uncertain", confidence: 0 };
    }

    return normalizeReceiptKindResult(parsed.data);
  } catch {
    return { kind: "uncertain", confidence: 0 };
  }
}

export function classifyReceiptKindFromOcrText(text: string): ReceiptKindResult {
  return normalizeReceiptKindResult(inferReceiptKindFromText(text));
}
