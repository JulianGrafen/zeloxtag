import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { withScanSessionId } from "@/lib/billing/free-scan-quota";
import { fuelOcrAccessFromFormData } from "@/lib/security/require-fuel-ocr";
import { extractFuelReceiptFromImage } from "@/lib/ocr/extract-fuel-receipt";
import { isLlmConfigured } from "@/lib/ocr/llm-client";
import type { FuelOcrApiError, FuelOcrApiSuccess } from "@/lib/fuel-receipt/types";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireWritableApiUser,
} from "@/lib/security/api-guard";
import { validateDocumentUpload } from "@/lib/security/file-upload";
import {
  automotiveGateErrorFromCaught,
  enforceAutomotiveGateFromFormData,
} from "@/lib/ocr/ocr-automotive-gate";
import {
  logServerError,
  publicClientMessage,
} from "@/lib/security/public-error";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const runtime = "nodejs";

const MAX_OCR_BYTES = 4 * 1024 * 1024;

const ALLOWED_OCR_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const formMetaSchema = z
  .object({
    vehicleId: z.string().uuid(),
    tagUuid: z.string().trim().min(1).max(128).optional(),
  })
  .strict();

function jsonError(
  status: number,
  error: string,
  code: FuelOcrApiError["code"] | "SUBSCRIPTION_REQUIRED" | "FREE_SCAN_EXHAUSTED",
) {
  const body: FuelOcrApiError = { ok: false, error, code };
  return NextResponse.json(body, { status });
}

/**
 * POST /api/ocr/fuel — owner-only fuel receipt field extraction (no document row).
 */
export async function POST(request: NextRequest) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;
    const limited = await enforceRateLimit(request, "ocr", "vision");
    if (limited) return limited;

    const { isConfigured } = getSupabaseEnv();
    if (!isConfigured) {
      return jsonError(
        503,
        "Supabase is not configured.",
        "config",
      );
    }

    if (!isLlmConfigured()) {
      return jsonError(503, "LLM API key is not configured.", "config");
    }

    const auth = await requireWritableApiUser();
    if (!auth.ok) return auth.response;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonError(400, "Expected multipart form data.", "bad_request");
    }

    const meta = formMetaSchema.safeParse({
      vehicleId: String(formData.get("vehicleId") ?? "").trim(),
      tagUuid: String(formData.get("tagUuid") ?? "").trim() || undefined,
    });

    if (!meta.success) {
      return jsonError(400, "vehicleId (UUID) is required.", "bad_request");
    }

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return jsonError(400, "Image file is required.", "bad_request");
    }

    const fileCheck = await validateDocumentUpload(file, {
      maxBytes: MAX_OCR_BYTES,
    });
    if (!fileCheck.ok) {
      return jsonError(400, fileCheck.error, "bad_request");
    }
    if (!ALLOWED_OCR_MIME.has(fileCheck.mime)) {
      return jsonError(
        400,
        "Only compressed images are accepted (JPEG, PNG, WebP, HEIC).",
        "bad_request",
      );
    }

    const gateBlocked = await enforceAutomotiveGateFromFormData(
      formData,
      fileCheck,
    );
    if (gateBlocked) return gateBlocked;

    const vehicleAccess = await fuelOcrAccessFromFormData(
      formData,
      auth.user.id,
    );
    if (!vehicleAccess.ok) {
      const payload = await vehicleAccess.response.json();
      const code = payload?.code;
      if (
        code === "FREE_SCAN_EXHAUSTED" ||
        code === "SUBSCRIPTION_REQUIRED"
      ) {
        return jsonError(
          403,
          typeof payload?.error === "string"
            ? payload.error
            : "ZeloxTag Pro erforderlich.",
          code,
        );
      }
      return vehicleAccess.response;
    }

    const bytes = Buffer.from(fileCheck.bytes);
    let extraction;
    try {
      extraction = await extractFuelReceiptFromImage({
        bytes,
        mimeType: fileCheck.mime,
      });
    } catch (error) {
      logServerError("[api/ocr/fuel] extraction failed", error);
      return jsonError(
        422,
        publicClientMessage(error, "Beleg konnte nicht ausgelesen werden."),
        "ocr_failed",
      );
    }

    const body: FuelOcrApiSuccess = {
      ok: true,
      extraction,
      freeScanSessionStarted: vehicleAccess.freeScanSessionStarted,
    };
    return NextResponse.json(
      withScanSessionId(body, vehicleAccess.scanSessionId),
      { status: 200 },
    );
  } catch (error) {
    const gateResponse = automotiveGateErrorFromCaught(error);
    if (gateResponse) return gateResponse;

    console.error("[api/ocr/fuel] unexpected", error);
    return jsonError(500, "OCR request failed.", "ocr_failed");
  }
}
