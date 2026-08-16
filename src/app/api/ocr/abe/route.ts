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
  AbeDataHunterReport,
  AbeHuntAuflagenExtraction,
  AbeHuntAuflagenTextExtraction,
  AbeHuntMarkingExtraction,
  AbeHuntStammdatenExtraction,
  AbeHuntStepResult,
  AbeHuntVehicleExtraction,
} from "@/lib/validations/abeDataHunterSchemas";
import type {
  AbeWizardCoverExtraction,
  AbeWizardMainExtraction,
  AbeWizardVehiclesExtraction,
} from "@/lib/validations/abeWizardSchemas";
import { abeDataHunterExtractionService } from "@/services/documents/AbeExtractionService";
import { abeExtractionService } from "@/services/ocr/AbeExtractionService";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;

const LEGACY_STEPS = ["cover", "main", "vehicles"] as const;
const HUNT_STEPS = [
  "hunt-all", // freestyle: every visible field from one photo
  "hunt-stammdaten",
  "hunt-kba", // alias → stammdaten
  "hunt-marking",
  "hunt-vehicle",
  "hunt-auflagen",
  "hunt-auflagen-text",
] as const;

const ABE_WIZARD_STEPS = [...LEGACY_STEPS, ...HUNT_STEPS] as const;
type AbeWizardStep = (typeof ABE_WIZARD_STEPS)[number];

const stepSchema = z.enum(ABE_WIZARD_STEPS);

type LegacySuccess =
  | { ok: true; step: "cover"; extraction: AbeWizardCoverExtraction }
  | { ok: true; step: "main"; extraction: AbeWizardMainExtraction }
  | { ok: true; step: "vehicles"; extraction: AbeWizardVehiclesExtraction };

type HuntSuccess =
  | {
      ok: true;
      step: "hunt-all";
      status: AbeHuntStepResult<AbeDataHunterReport>["status"];
      extraction: AbeDataHunterReport;
      reason?: string;
    }
  | {
      ok: true;
      step: "hunt-stammdaten" | "hunt-kba";
      status: AbeHuntStepResult<AbeHuntStammdatenExtraction>["status"];
      extraction: AbeHuntStammdatenExtraction;
      reason?: string;
    }
  | {
      ok: true;
      step: "hunt-marking";
      status: AbeHuntStepResult<AbeHuntMarkingExtraction>["status"];
      extraction: AbeHuntMarkingExtraction;
      reason?: string;
    }
  | {
      ok: true;
      step: "hunt-vehicle";
      status: AbeHuntStepResult<AbeHuntVehicleExtraction>["status"];
      extraction: AbeHuntVehicleExtraction;
      reason?: string;
    }
  | {
      ok: true;
      step: "hunt-auflagen";
      status: AbeHuntStepResult<AbeHuntAuflagenExtraction>["status"];
      extraction: AbeHuntAuflagenExtraction;
      reason?: string;
    }
  | {
      ok: true;
      step: "hunt-auflagen-text";
      status: AbeHuntStepResult<AbeHuntAuflagenTextExtraction>["status"];
      extraction: AbeHuntAuflagenTextExtraction;
      reason?: string;
    };

type StepSuccess = LegacySuccess | HuntSuccess;

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
 * Data-hunter steps never fail the request on Zod/completeness misses —
 * they return `{ status: "needs_manual", extraction }` for HITL entry.
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
        "Unsupported or spoofed file type (PDF/JPEG/PNG/WebP/HEIC required).",
        "bad_request",
      );
    }

    const input = { bytes, contentType: sniffed };

    if (step === "cover") {
      const extraction =
        await abeExtractionService.extractCoverFromDocument(input);
      return NextResponse.json({
        ok: true,
        step: "cover",
        extraction,
      } satisfies LegacySuccess);
    }

    if (step === "main") {
      const extraction =
        await abeExtractionService.extractMainFromDocument(input);
      return NextResponse.json({
        ok: true,
        step: "main",
        extraction,
      } satisfies LegacySuccess);
    }

    if (step === "vehicles") {
      const extraction =
        await abeExtractionService.extractVehiclesFromDocument(input);
      return NextResponse.json({
        ok: true,
        step: "vehicles",
        extraction,
      } satisfies LegacySuccess);
    }

    if (step === "hunt-all") {
      const result =
        await abeDataHunterExtractionService.extractAllFromPhoto(input);
      return NextResponse.json({
        ok: true,
        step: "hunt-all",
        status: result.status,
        extraction: result.extraction,
        reason: result.reason,
      } satisfies HuntSuccess);
    }

    if (step === "hunt-kba") {
      const result =
        await abeDataHunterExtractionService.extractKbaFromPhoto(input);
      return NextResponse.json({
        ok: true,
        step,
        status: result.status,
        extraction: result.extraction,
        reason: result.reason,
      } satisfies HuntSuccess);
    }

    if (step === "hunt-stammdaten") {
      const result =
        await abeDataHunterExtractionService.extractStammdatenSnippet(input);
      return NextResponse.json({
        ok: true,
        step,
        status: result.status,
        extraction: result.extraction,
        reason: result.reason,
      } satisfies HuntSuccess);
    }

    if (step === "hunt-marking") {
      const result =
        await abeDataHunterExtractionService.extractMarkingSnippet(input);
      return NextResponse.json({
        ok: true,
        step: "hunt-marking",
        status: result.status,
        extraction: result.extraction,
        reason: result.reason,
      } satisfies HuntSuccess);
    }

    if (step === "hunt-vehicle") {
      const result =
        await abeDataHunterExtractionService.extractVehicleSnippet(input);
      return NextResponse.json({
        ok: true,
        step: "hunt-vehicle",
        status: result.status,
        extraction: result.extraction,
        reason: result.reason,
      } satisfies HuntSuccess);
    }

    if (step === "hunt-auflagen-text") {
      let targetCodes: string[] = [];
      const rawCodes = formData.get("targetCodes");
      if (typeof rawCodes === "string" && rawCodes.trim()) {
        try {
          const parsed = JSON.parse(rawCodes) as unknown;
          if (Array.isArray(parsed)) {
            targetCodes = parsed.filter(
              (code): code is string =>
                typeof code === "string" && code.trim().length > 0,
            );
          }
        } catch {
          targetCodes = [];
        }
      }

      const result =
        await abeDataHunterExtractionService.extractAuflagenTextFromPhoto(
          input,
          targetCodes,
        );
      return NextResponse.json({
        ok: true,
        step: "hunt-auflagen-text",
        status: result.status,
        extraction: result.extraction,
        reason: result.reason,
      } satisfies HuntSuccess);
    }

    const result =
      await abeDataHunterExtractionService.extractAuflagenSnippet(input);
    return NextResponse.json({
      ok: true,
      step: "hunt-auflagen",
      status: result.status,
      extraction: result.extraction,
      reason: result.reason,
    } satisfies HuntSuccess);
  } catch (error) {
    console.error("[api/ocr/abe] unexpected", error);
    return jsonError(500, "Extraktion fehlgeschlagen.", "extract_failed");
  }
}
