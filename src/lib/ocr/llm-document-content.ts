import type OpenAI from "openai";

import type { OcrJsonPayload } from "./ocr-types";

/** Stable model id returned to clients (no Azure DI). */
export const LLM_VISION_PARSE_MODEL_ID = "llm-vision";

export type DocumentBytesInput = {
  bytes: Buffer;
  contentType: string;
};

export type DocumentUserMessagePart =
  OpenAI.Chat.Completions.ChatCompletionContentPart;

/**
 * Build multimodal user content: instruction text + document bytes (PDF or image).
 */
export function buildDocumentUserMessage(
  instructionLines: string[],
  input: DocumentBytesInput,
): DocumentUserMessagePart[] {
  const parts: DocumentUserMessagePart[] = instructionLines
    .filter((line) => line.length > 0)
    .map((text) => ({ type: "text" as const, text }));

  parts.push(buildDocumentContentPart(input));
  return parts;
}

function buildDocumentContentPart(
  input: DocumentBytesInput,
): DocumentUserMessagePart {
  const base64 = input.bytes.toString("base64");

  if (input.contentType === "application/pdf") {
    return {
      type: "file",
      file: {
        filename: "document.pdf",
        file_data: `data:application/pdf;base64,${base64}`,
      },
    };
  }

  return {
    type: "image_url",
    image_url: {
      url: `data:${input.contentType};base64,${base64}`,
      detail: "high",
    },
  };
}

/** Placeholder OCR payload — API shape unchanged, no Azure text. */
export function buildStubOcrPayload(
  contentType: string,
): OcrJsonPayload {
  return {
    modelId: LLM_VISION_PARSE_MODEL_ID,
    locale: "de-DE",
    pageCount: contentType === "application/pdf" ? 1 : 1,
    text: "",
    coverText: "",
    headerLines: [],
    contentFormat: "text",
  };
}
