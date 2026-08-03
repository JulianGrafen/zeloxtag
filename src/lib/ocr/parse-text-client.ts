import type { InvoiceTextParseResult } from "./text-parse-schema";

export type ParseTextApiSuccess = {
  ok: true;
  fields: InvoiceTextParseResult;
};

export type ParseTextApiError = {
  ok: false;
  error: string;
  code?: string;
};

export class ParseTextClientError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ParseTextClientError";
    this.code = code;
  }
}

/**
 * Browser helper: send Tesseract raw text to `/api/ocr/parse-text`.
 */
export async function parseInvoiceText(
  rawText: string,
): Promise<InvoiceTextParseResult> {
  const response = await fetch("/api/ocr/parse-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawText }),
  });

  let payload: ParseTextApiSuccess | ParseTextApiError;
  try {
    payload = (await response.json()) as ParseTextApiSuccess | ParseTextApiError;
  } catch {
    throw new ParseTextClientError("Ungültige Server-Antwort beim Text-Parse.");
  }

  if (!response.ok || !payload.ok) {
    const errorPayload = payload as ParseTextApiError;
    throw new ParseTextClientError(
      errorPayload.error || "Text-Parse fehlgeschlagen.",
      errorPayload.code,
    );
  }

  return payload.fields;
}
