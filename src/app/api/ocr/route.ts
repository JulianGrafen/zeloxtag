import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { extractInvoiceFromImage, OcrExtractionError } from "@/lib/ocr/extract-invoice";
import { isLlmConfigured } from "@/lib/ocr/llm-client";
import { OcrPersistError, persistOcrInvoice } from "@/lib/ocr/persist-invoice";
import type { OcrApiError, OcrApiSuccess } from "@/lib/ocr/types";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const runtime = "nodejs";

/** OCR images should already be client-compressed; keep a hard server cap. */
const MAX_OCR_BYTES = 4 * 1024 * 1024;

const ALLOWED_OCR_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function jsonError(
  status: number,
  error: string,
  code: OcrApiError["code"],
) {
  const body: OcrApiError = { ok: false, error, code };
  return NextResponse.json(body, { status });
}

/**
 * POST /api/ocr
 * 1) Validate owner + compressed invoice image
 * 2) Run gpt-4o-mini vision OCR (strict JSON schema)
 * 3) Only after success → Supabase Storage + documents row for vehicle_id
 */
export async function POST(request: NextRequest) {
  try {
    const { isConfigured } = getSupabaseEnv();
    if (!isConfigured) {
      return jsonError(
        503,
        "Supabase is not configured. OCR persistence requires Supabase.",
        "config",
      );
    }

    if (!isLlmConfigured()) {
      return jsonError(
        503,
        "LLM API key is not configured (API_KEY / AZURE_API_KEY / OPENAI_API_KEY).",
        "config",
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return jsonError(401, "Authentication required.", "unauthorized");
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonError(400, "Expected multipart form data.", "bad_request");
    }

    const vehicleId = String(formData.get("vehicleId") ?? "").trim();
    const tagUuid = String(formData.get("tagUuid") ?? "").trim();
    const file = formData.get("file");

    if (!vehicleId) {
      return jsonError(400, "vehicleId is required.", "bad_request");
    }

    if (!(file instanceof File) || file.size === 0) {
      return jsonError(400, "Image file is required.", "bad_request");
    }

    if (!ALLOWED_OCR_MIME.has(file.type)) {
      return jsonError(
        400,
        "Only compressed images are accepted (JPEG, PNG, WebP, HEIC).",
        "bad_request",
      );
    }

    if (file.size > MAX_OCR_BYTES) {
      return jsonError(
        400,
        "Image too large after compression (max 4 MB). Compress on the client first.",
        "bad_request",
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    // Step A — OCR first (no storage write yet).
    let ocr;
    try {
      ocr = await extractInvoiceFromImage({
        bytes,
        mimeType: file.type,
      });
    } catch (error) {
      const message =
        error instanceof OcrExtractionError
          ? error.message
          : "OCR extraction failed.";
      return jsonError(422, message, "ocr_failed");
    }

    // Step B — Persist only after successful parse.
    let document;
    try {
      document = await persistOcrInvoice({
        vehicleId,
        userId: user.id,
        bytes,
        mimeType: file.type,
        originalName: file.name,
        ocr,
      });
    } catch (error) {
      if (error instanceof OcrPersistError) {
        const forbidden = error.message.toLowerCase().includes("write access");
        return jsonError(
          forbidden ? 403 : 500,
          error.message,
          forbidden ? "forbidden" : "storage_failed",
        );
      }
      return jsonError(500, "Failed to store invoice after OCR.", "storage_failed");
    }

    if (tagUuid) {
      revalidatePath(`/v/${tagUuid}`);
      revalidatePath(`/v/${tagUuid}/dokumente`);
    }

    const body: OcrApiSuccess = {
      ok: true,
      ocr,
      document: {
        id: document.id,
        vehicle_id: document.vehicle_id,
        title: document.title,
        type: document.type === "tuev" ? "tuev" : "invoice",
        file_url: document.file_url,
        amount: document.amount,
        date: document.date,
        category: ocr.category,
        created_at: document.created_at,
      },
    };

    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected OCR route error.";
    return jsonError(500, message, "storage_failed");
  }
}
