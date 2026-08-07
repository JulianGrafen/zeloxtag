import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { isLlmConfigured } from "@/lib/ocr/llm-client";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireApiUser,
} from "@/lib/security/api-guard";
import { sniffAllowedMime } from "@/lib/security/file-upload";
import type {
  AbeWizardCoverExtraction,
  AbeWizardMainExtraction,
  AbeWizardVehiclesExtraction,
} from "@/lib/validations/abeWizardSchemas";
import { abeExtractionService } from "@/services/ocr/AbeExtractionService";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;

const ABE_WIZARD_STEPS = ["cover", "main", "vehicles"] as const;
type AbeWizardStep = (typeof ABE_WIZARD_STEPS)[number];

const stepSchema = z.enum(ABE_WIZARD_STEPS);

type StepSuccess =
  | { ok: true; step: "cover"; extraction: AbeWizardCoverExtraction }
  | { ok: true; step: "main"; extraction: AbeWizardMainExtraction }
  | { ok: true; step: "vehicles"; extraction: AbeWizardVehiclesExtraction };

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
 * POST /api/ocr/abe
 *
 * Guided ABE wizard extraction — processes one photographed page per call.
 *
 * FormData fields:
 *   file  – image of the document page
 *   step  – "cover" | "main" | "vehicles"
 *
 * Responses:
 *   cover    → AbeWizardCoverExtraction (KBA, design, dimensions, article numbers)
 *   main     → AbeWizardMainExtraction (official ABE number, manufacturer, org)
 *   vehicles → AbeWizardVehiclesExtraction (compatibility table rows)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const limited = await enforceRateLimit(request, "ocr", "abe");
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
        `step must be one of: ${ABE_WIZARD_STEPS.join(", ")}.`,
        "bad_request",
      );
    }
    const step: AbeWizardStep = stepParsed.data;

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
        "Unsupported or spoofed file type (JPEG/PNG/WebP/HEIC required).",
        "bad_request",
      );
    }

    const input = { bytes, contentType: sniffed };

    if (step === "cover") {
      const extraction = await abeExtractionService.extractCoverFromDocument(input);
      const body: StepSuccess = { ok: true, step: "cover", extraction };
      return NextResponse.json(body);
    }

    if (step === "main") {
      const extraction = await abeExtractionService.extractMainFromDocument(input);
      const body: StepSuccess = { ok: true, step: "main", extraction };
      return NextResponse.json(body);
    }

    const extraction = await abeExtractionService.extractVehiclesFromDocument(input);
    const body: StepSuccess = { ok: true, step: "vehicles", extraction };
    return NextResponse.json(body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected extraction error.";
    return jsonError(500, message, "extract_failed");
  }
}
