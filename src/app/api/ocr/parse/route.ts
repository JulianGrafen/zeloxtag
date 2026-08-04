import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  analyzeDocument,
  DocumentIntelligenceError,
} from "@/lib/ocr/document-intelligence";
import { getDocumentIntelligenceEnv } from "@/lib/ocr/document-intelligence-env";
import { isLlmConfigured } from "@/lib/ocr/llm-client";
import { resolveParseModel } from "@/lib/ocr/model-routing";
import { OCR_DOCUMENT_TYPES, type OcrDocumentType } from "@/lib/ocr/ocr-types";
import {
  invoiceTextParseSchema,
  type InvoiceTextParseResult,
} from "@/lib/ocr/text-parse-schema";
import { enforceRateLimit } from "@/lib/security/api-guard";
import { sniffAllowedMime } from "@/lib/security/file-upload";

export const runtime = "nodejs";
export const maxDuration = 60;

/** High-fidelity invoice photos / multi-page PDFs. */
const MAX_BYTES = 25 * 1024 * 1024;

const documentTypeSchema = z.enum(OCR_DOCUMENT_TYPES);

type ParseSuccess = {
  ok: true;
  documentType: OcrDocumentType;
  parseModel: string;
  contentFormat: "markdown" | "text";
  fields: InvoiceTextParseResult;
  rawText: string;
  modelId: string;
};

type ParseError = {
  ok: false;
  error: string;
  code:
    | "unauthorized"
    | "bad_request"
    | "config"
    | "azure_unreachable"
    | "parse_failed"
    | "rate_limited";
};

function jsonError(
  status: number,
  error: string,
  code: ParseError["code"],
) {
  const body: ParseError = { ok: false, error, code };
  return NextResponse.json(body, { status });
}

/**
 * POST /api/ocr/parse
 *
 * ZeloxTag OCR pipeline:
 * 1) Azure Document Intelligence → Markdown (`outputContentFormat=markdown`)
 * 2) Dynamic model routing by `documentType` (invoice vs abe/tuev)
 * 3) Domain parse service + Zod validation before response
 */
export async function POST(request: NextRequest) {
  try {
    const limited = enforceRateLimit(request, "ocr", "parse");
    if (limited) return limited;

    const { isConfigured } = getDocumentIntelligenceEnv();
    if (!isConfigured) {
      return jsonError(
        503,
        "Dokumentanalyse ist nicht konfiguriert.",
        "config",
      );
    }

    if (!isLlmConfigured()) {
      return jsonError(
        503,
        "LLM API key fehlt (API_KEY) — benötigt für Markdown → JSON Parse.",
        "config",
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonError(400, "Expected multipart form data.", "bad_request");
    }

    const documentTypeRaw = String(formData.get("documentType") ?? "").trim();
    const documentTypeParsed = documentTypeSchema.safeParse(documentTypeRaw);
    if (!documentTypeParsed.success) {
      return jsonError(
        400,
        `documentType is required (one of: ${OCR_DOCUMENT_TYPES.join(", ")}).`,
        "bad_request",
      );
    }
    const documentType = documentTypeParsed.data;

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return jsonError(400, "Document file is required.", "bad_request");
    }

    if (file.size > MAX_BYTES) {
      return jsonError(
        400,
        `Datei zu groß (max. ${Math.round(MAX_BYTES / (1024 * 1024))} MB).`,
        "bad_request",
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffAllowedMime(bytes);
    const contentType = sniffed ?? file.type;
    if (!sniffed) {
      return jsonError(
        400,
        "Unsupported or spoofed file type (PDF/JPEG/PNG/WebP/HEIC required).",
        "bad_request",
      );
    }

    const result = await analyzeDocument({
      bytes,
      contentType,
      documentType,
      kind: documentType === "abe" ? "abe" : "invoice",
    });

    // Defense in depth: re-validate LLM-shaped fields before responding.
    const validated = invoiceTextParseSchema.safeParse(result.fields);
    if (!validated.success) {
      return jsonError(
        422,
        "LLM output failed Zod schema validation.",
        "parse_failed",
      );
    }

    const body: ParseSuccess = {
      ok: true,
      documentType: result.documentType,
      parseModel: result.parseModel || resolveParseModel(documentType),
      contentFormat: result.ocrJson.contentFormat,
      fields: validated.data,
      rawText: result.rawText,
      modelId: result.modelId,
    };
    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof DocumentIntelligenceError) {
      const unreachable = /unreachable/i.test(error.message);
      return jsonError(
        unreachable ? 503 : 502,
        error.message,
        unreachable ? "azure_unreachable" : "parse_failed",
      );
    }

    const message =
      error instanceof Error ? error.message : "Unexpected OCR parse error.";
    return jsonError(500, message, "parse_failed");
  }
}
