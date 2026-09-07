import { NextResponse, type NextRequest } from "next/server";

import { isLlmConfigured } from "@/lib/ocr/llm-client";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireWritableApiUser,
} from "@/lib/security/api-guard";
import {
  validateDocumentUpload,
} from "@/lib/security/file-upload";
import {
  automotiveGateErrorFromCaught,
  enforceAutomotiveGateFromFormData,
} from "@/lib/ocr/ocr-automotive-gate";
import { AUTOMOTIVE_REJECTION_CODE } from "@/lib/ocr/verify-automotive-context";
import { FEATURE } from "@/lib/permissions/feature-access";
import { withScanSessionId } from "@/lib/billing/free-scan-quota";
import { ocrAccessFromFormData } from "@/lib/security/require-vehicle-ocr";
import { AbePdfPageLimitError } from "@/lib/ocr/abe-pdf-kba-locator";
import { requiresAbeManualFallback } from "@/lib/validations/abeVisionExtractionSchemas";
import { abeVisionExtractor } from "@/services/documents/VisionExtractor";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;

type ExtractSuccess = {
  ok: true;
  extraction: {
    kba_number: string | null;
    abe_nr: string | null;
    part_type: string | null;
    auflagen: string[];
    confidence_score: number;
  };
  pageCount: number;
  model: string;
  manualFallback: boolean;
};

type ExtractError = {
  ok: false;
  error: string;
  code: "unauthorized" | "bad_request" | "config" | "rate_limited" | typeof AUTOMOTIVE_REJECTION_CODE;
};

function jsonError(
  status: number,
  error: string,
  code: ExtractError["code"],
): NextResponse<ExtractError> {
  return NextResponse.json({ ok: false, error, code }, { status });
}

async function readUploadFiles(formData: FormData): Promise<File[]> {
  const fromFiles = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (fromFiles.length > 0) return fromFiles;

  const single = formData.get("file");
  if (single instanceof File && single.size > 0) return [single];

  return [];
}

/**
 * POST /api/documents/abe-extract
 *
 * Universal ABE ingestion + vision extraction pipeline.
 * Always returns structured extraction JSON — empty fields trigger manual UI fallback.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const limited = await enforceRateLimit(request, "ocr", "abe-extract");
    if (limited) return limited;

    const auth = await requireWritableApiUser();
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
      return jsonError(400, "Multipart-Upload erwartet.", "bad_request");
    }

    const uploads = await readUploadFiles(formData);
    if (uploads.length === 0) {
      return jsonError(
        400,
        "Bitte mindestens eine Datei (PDF oder Bild) hochladen.",
        "bad_request",
      );
    }

    const pdfUploads = uploads.filter(
      (file) =>
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf"),
    );

    if (pdfUploads.length > 1) {
      return jsonError(400, "Nur ein PDF pro Upload.", "bad_request");
    }

    if (pdfUploads.length === 1 && uploads.length > 1) {
      return jsonError(
        400,
        "PDF und Bilder können nicht gemischt werden.",
        "bad_request",
      );
    }

    const gateSource = pdfUploads[0] ?? uploads[0]!;
    const gateValidated = await validateDocumentUpload(gateSource, {
      maxBytes: MAX_BYTES,
      pdfOnly: pdfUploads.length === 1,
    });
    if (!gateValidated.ok) {
      return jsonError(400, gateValidated.error, "bad_request");
    }

    const gateBlocked = await enforceAutomotiveGateFromFormData(
      formData,
      gateValidated,
    );
    if (gateBlocked) return gateBlocked;

    const vehicleAccess = await ocrAccessFromFormData(
      formData,
      auth.user.id,
      FEATURE.SCAN_AI_RECEIPT,
      "abe",
    );
    if (!vehicleAccess.ok) return vehicleAccess.response;
    const scanSessionId = vehicleAccess.scanSessionId;

    if (pdfUploads.length === 1) {
      const pdf = pdfUploads[0]!;
      const validated = gateValidated;

      const bytes = Buffer.from(validated.bytes);
      const result = await abeVisionExtractor.extract({
        kind: "pdf",
        bytes,
      });

      const body: ExtractSuccess = {
        ok: true,
        extraction: result.extraction,
        pageCount: result.pageCount,
        model: result.model,
        manualFallback: requiresAbeManualFallback(result.extraction),
      };
      return NextResponse.json(withScanSessionId(body, scanSessionId));
    }

    const imageFiles: Array<{ bytes: Buffer; contentType: string; name: string }> =
      [];

    for (const file of uploads) {
      const validated = await validateDocumentUpload(file, {
        maxBytes: MAX_BYTES,
      });
      if (!validated.ok) {
        return jsonError(400, validated.error, "bad_request");
      }
      if (validated.mime === "application/pdf") {
        return jsonError(400, "Nur ein PDF pro Upload.", "bad_request");
      }

      imageFiles.push({
        bytes: Buffer.from(validated.bytes),
        contentType: validated.mime,
        name: file.name,
      });
    }

    const result = await abeVisionExtractor.extract({
      kind: "images",
      files: imageFiles,
    });

    const body: ExtractSuccess = {
      ok: true,
      extraction: result.extraction,
      pageCount: result.pageCount,
      model: result.model,
      manualFallback: requiresAbeManualFallback(result.extraction),
    };
    return NextResponse.json(withScanSessionId(body, scanSessionId));
  } catch (error) {
    if (error instanceof AbePdfPageLimitError) {
      return jsonError(400, error.message, "bad_request");
    }

    const gateResponse = automotiveGateErrorFromCaught(error);
    if (gateResponse) return gateResponse;

    console.error("[abe-extract]", error);
    return jsonError(500, "Extraktion fehlgeschlagen.", "bad_request");
  }
}
