import type OpenAI from "openai";

import { getOcrLlmClient } from "./llm-client";
import {
  FUEL_RECEIPT_OCR_JSON_SCHEMA,
  isFuelReceiptOcrFields,
  normalizeFuelReceiptOcrFields,
} from "./fuel-receipt-schema";
import type { FuelReceiptExtraction } from "@/lib/fuel-receipt/types";

const OCR_MAX_TOKENS = 160;

const FUEL_RECEIPT_SYSTEM_PROMPT =
  "Du extrahierst Felder von deutschen Tankstellen-Quittungen. " +
  "Antworte nur mit JSON. Unlesbar → null. " +
  "Gesamtbetrag = Summe/Brutto/Gesamt in EUR. " +
  "liter = getankte MENGE in Litern (Zeile Menge, Liter, L) — NICHT der Literpreis (€/L). " +
  "pricePerLiter = Literpreis in EUR/L falls gedruckt.";

const FUEL_RECEIPT_USER_PROMPT =
  "Lies diese Tankquittung. Extrahiere Datum (YYYY-MM-DD), Gesamtbetrag EUR, " +
  "getankte Liter (Volumen) und Literpreis €/L falls vorhanden.";

export class FuelOcrExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FuelOcrExtractionError";
  }
}

export async function extractFuelReceiptFromImage(input: {
  bytes: Buffer;
  mimeType: string;
}): Promise<FuelReceiptExtraction> {
  let client: OpenAI;
  let model: string;
  try {
    ({ client, model } = getOcrLlmClient());
  } catch (error) {
    throw new FuelOcrExtractionError(
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
        json_schema: FUEL_RECEIPT_OCR_JSON_SCHEMA,
      },
      messages: [
        {
          role: "system",
          content: FUEL_RECEIPT_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: FUEL_RECEIPT_USER_PROMPT,
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "OpenAI request failed.";
    throw new FuelOcrExtractionError(`OCR request failed: ${message}`);
  }

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new FuelOcrExtractionError("OCR returned an empty response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new FuelOcrExtractionError("OCR returned invalid JSON.");
  }

  if (!isFuelReceiptOcrFields(parsed)) {
    throw new FuelOcrExtractionError("OCR payload failed schema validation.");
  }

  return normalizeFuelReceiptOcrFields(parsed);
}
