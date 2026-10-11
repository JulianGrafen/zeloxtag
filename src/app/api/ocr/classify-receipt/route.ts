import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { isLlmConfigured } from "@/lib/ocr/llm-client";
import { classifyReceiptKindFromImage } from "@/services/ocr/ReceiptKindClassificationService";
import type { ReceiptKindResult } from "@/lib/receipt/receipt-kind";
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
import { logServerError } from "@/lib/security/public-error";
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
  })
  .strict();

type ClassifySuccess = {
  ok: true;
  classification: ReceiptKindResult;
};

type ClassifyError = {
  ok: false;
  error: string;
  code: "bad_request" | "config" | "rate_limited" | "forbidden";
};

function jsonError(
  status: number,
  error: string,
  code: ClassifyError["code"],
) {
  return NextResponse.json({ ok: false, error, code } satisfies ClassifyError, {
    status,
  });
}

/** POST /api/ocr/classify-receipt — route fuel vs workshop (no quota consumption). */
export async function POST(request: NextRequest) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;
    const limited = await enforceRateLimit(request, "ocr", "vision");
    if (limited) return limited;

    const { isConfigured } = getSupabaseEnv();
    if (!isConfigured) {
      return jsonError(503, "Supabase is not configured.", "config");
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
        "Only images are accepted for classification (JPEG, PNG, WebP, HEIC).",
        "bad_request",
      );
    }

    const gateBlocked = await enforceAutomotiveGateFromFormData(
      formData,
      fileCheck,
      { profile: "fuel_receipt" },
    );
    if (gateBlocked) return gateBlocked;

    const bytes = Buffer.from(fileCheck.bytes);
    const classification = await classifyReceiptKindFromImage({
      bytes,
      mimeType: fileCheck.mime,
    });

    const body: ClassifySuccess = { ok: true, classification };
    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    const gateResponse = automotiveGateErrorFromCaught(error);
    if (gateResponse) return gateResponse;

    logServerError("[api/ocr/classify-receipt] unexpected", error);
    return jsonError(500, "Classification failed.", "bad_request");
  }
}
