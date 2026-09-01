import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { isLlmConfigured } from "@/lib/ocr/llm-client";
import {
  isInvoiceNanoTestMode,
  resolveInvoiceParseModel,
} from "@/lib/ocr/model-routing";
import type { InvoiceTextParseCategory } from "@/lib/ocr/text-parse-schema";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireApiUser,
} from "@/lib/security/api-guard";
import { requireVehicleOcrAccess } from "@/lib/security/require-vehicle-ocr";
import { logServerError } from "@/lib/security/public-error";
import { validateDocumentUpload } from "@/lib/security/file-upload";
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
  | {
      ok: true;
      step: "overview";
      extraction: InvoiceOverviewExtraction;
      parseModel: string;
      invoiceNanoTestMode: boolean;
    }
  | {
      ok: true;
      step: "header";
      extraction: InvoiceHeaderExtraction;
      parseModel: string;
      invoiceNanoTestMode: boolean;
    }
  | {
      ok: true;
      step: "line-items";
      extraction: InvoiceLineItemsExtraction;
      parseModel: string;
      invoiceNanoTestMode: boolean;
    };

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

    const vehicleAccess = await requireVehicleOcrAccess(
      auth.user.id,
      String(formData.get("vehicleId") ?? ""),
    );
    if (!vehicleAccess.ok) return vehicleAccess.response;

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

    const fileCheck = await validateDocumentUpload(file, { maxBytes: MAX_BYTES });
    if (!fileCheck.ok) {
      return jsonError(400, fileCheck.error, "bad_request");
    }
    const bytes = Buffer.from(fileCheck.bytes);
    const sniffed = fileCheck.mime;

    const input = { bytes, contentType: sniffed };
    const options = { lockedCategory };
    const parseModel = resolveInvoiceParseModel();
    const invoiceNanoTestMode = isInvoiceNanoTestMode();

    if (invoiceNanoTestMode) {
      console.warn(
        "[api/ocr/invoice] INVOICE_USE_NANO=true — using economy model for quality/cost test",
        { parseModel },
      );
    }

    if (step === "overview") {
      const extraction =
        await invoiceExtractionService.extractOverviewFromDocument(
          input,
          options,
        );
      const body: StepSuccess = {
        ok: true,
        step: "overview",
        extraction,
        parseModel,
        invoiceNanoTestMode,
      };
      return NextResponse.json(body);
    }

    if (step === "header") {
      const extraction =
        await invoiceExtractionService.extractHeaderFromDocument(input, options);
      const body: StepSuccess = {
        ok: true,
        step: "header",
        extraction,
        parseModel,
        invoiceNanoTestMode,
      };
      return NextResponse.json(body);
    }

    const extraction =
      await invoiceExtractionService.extractLineItemsFromDocument(input, options);
    const body: StepSuccess = {
      ok: true,
      step: "line-items",
      extraction,
      parseModel,
      invoiceNanoTestMode,
    };
    return NextResponse.json(body);
  } catch (error) {
    logServerError("[api/ocr/invoice] unexpected", error);
    return jsonError(
      500,
      "Rechnungsauswertung fehlgeschlagen. Bitte erneut versuchen.",
      "extract_failed",
    );
  }
}
