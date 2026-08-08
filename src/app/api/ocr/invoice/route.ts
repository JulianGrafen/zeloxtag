import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { isLlmConfigured } from "@/lib/ocr/llm-client";
import type { InvoiceTextParseCategory } from "@/lib/ocr/text-parse-schema";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireApiUser,
} from "@/lib/security/api-guard";
import { sniffAllowedMime } from "@/lib/security/file-upload";
import {
  invoiceExtractionService,
  type InvoiceHeaderExtraction,
  type InvoiceLineItemsExtraction,
  type InvoiceOverviewExtraction,
} from "@/services/ocr/InvoiceExtractionService";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;

const INVOICE_WIZARD_STEPS = ["overview", "header", "line-items"] as const;
type InvoiceWizardStep = (typeof INVOICE_WIZARD_STEPS)[number];

const stepSchema = z.enum(INVOICE_WIZARD_STEPS);

const lockedCategorySchema = z
  .enum(["tuning", "service", "repair", "other"])
  .optional();

type StepSuccess =
  | { ok: true; step: "overview"; extraction: InvoiceOverviewExtraction }
  | { ok: true; step: "header"; extraction: InvoiceHeaderExtraction }
  | { ok: true; step: "line-items"; extraction: InvoiceLineItemsExtraction };

type StepError = {
  ok: false;
  error: string;
  code:
    | "unauthorized"
    | "bad_request"
    | "config"
    | "extract_failed"
    | "rate_limited";
};

function jsonError(
  status: number,
  error: string,
  code: StepError["code"],
): NextResponse<StepError> {
  return NextResponse.json({ ok: false, error, code }, { status });
}

/**
 * POST /api/ocr/invoice
 *
 * Guided invoice wizard — one captured section per call.
 *
 * FormData:
 *   file            – image or PDF
 *   step            – "overview" | "header" | "line-items"
 *   lockedCategory  – optional category lock from scan picker
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const limited = await enforceRateLimit(request, "ocr", "invoice");
    if (limited) return limited;

    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    if (!isLlmConfigured()) {
      return jsonError(
        503,
        "Dokumentanalyse ist nicht vollständig konfiguriert.",
        "config",
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonError(400, "Expected multipart form data.", "bad_request");
    }

    const stepRaw = String(formData.get("step") ?? "").trim();
    const stepParsed = stepSchema.safeParse(stepRaw);
    if (!stepParsed.success) {
      return jsonError(
        400,
        `step must be one of: ${INVOICE_WIZARD_STEPS.join(", ")}.`,
        "bad_request",
      );
    }
    const step: InvoiceWizardStep = stepParsed.data;

    const lockedRaw = String(formData.get("lockedCategory") ?? "").trim();
    const lockedParsed = lockedCategorySchema.safeParse(
      lockedRaw || undefined,
    );
    const lockedCategory = lockedParsed.success
      ? (lockedParsed.data as InvoiceTextParseCategory)
      : null;

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
    if (!sniffed) {
      return jsonError(
        400,
        "Unsupported or spoofed file type (PDF/JPEG/PNG/WebP/HEIC required).",
        "bad_request",
      );
    }

    const input = { bytes, contentType: sniffed };
    const options = { lockedCategory };

    if (step === "overview") {
      const extraction =
        await invoiceExtractionService.extractOverviewFromDocument(
          input,
          options,
        );
      const body: StepSuccess = { ok: true, step: "overview", extraction };
      return NextResponse.json(body);
    }

    if (step === "header") {
      const extraction =
        await invoiceExtractionService.extractHeaderFromDocument(input, options);
      const body: StepSuccess = { ok: true, step: "header", extraction };
      return NextResponse.json(body);
    }

    const extraction =
      await invoiceExtractionService.extractLineItemsFromDocument(input, options);
    const body: StepSuccess = { ok: true, step: "line-items", extraction };
    return NextResponse.json(body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected extraction error.";
    return jsonError(500, message, "extract_failed");
  }
}
