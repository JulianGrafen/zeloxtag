import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { extractInvoiceFromImage, OcrExtractionError } from "@/lib/ocr/extract-invoice";
import { isLlmConfigured } from "@/lib/ocr/llm-client";
import { OcrPersistError, persistOcrInvoice } from "@/lib/ocr/persist-invoice";
import type { OcrApiError, OcrApiSuccess } from "@/lib/ocr/types";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireApiUser,
} from "@/lib/security/api-guard";
import { requireVehicleOcrAccess } from "@/lib/security/require-vehicle-ocr";
import { sniffAllowedMime } from "@/lib/security/file-upload";
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

const formMetaSchema = z
  .object({
    vehicleId: z.string().uuid(),
    tagUuid: z.string().trim().min(1).max(128).optional(),
  })
  .strict();

function jsonError(
  status: number,
  error: string,
  code: OcrApiError["code"] | "rate_limited",
) {
  const body = { ok: false as const, error, code };
  return NextResponse.json(body, { status });
}

/**
 * POST /api/ocr
 * 1) Validate owner + compressed invoice image
 * 2) Run vision OCR (strict JSON schema)
 * 3) Only after success → Supabase Storage + documents row for vehicle_id
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
        "Supabase is not configured. OCR persistence requires Supabase.",
        "config",
      );
    }

    if (!isLlmConfigured()) {
      return jsonError(
        503,
        "LLM API key is not configured.",
        "config",
      );
    }

    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonError(400, "Expected multipart form data.", "bad_request");
    }

    const tagRaw = String(formData.get("tagUuid") ?? "").trim();
    const meta = formMetaSchema.safeParse({
      vehicleId: String(formData.get("vehicleId") ?? "").trim(),
      ...(tagRaw ? { tagUuid: tagRaw } : {}),
    });

    if (!meta.success) {
      return jsonError(400, "vehicleId (UUID) is required.", "bad_request");
    }

    const vehicleAccess = await requireVehicleOcrAccess(
      auth.user.id,
      meta.data.vehicleId,
    );
    if (!vehicleAccess.ok) return vehicleAccess.response;
    const user = auth.user;

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return jsonError(400, "Image file is required.", "bad_request");
    }

    if (file.size > MAX_OCR_BYTES) {
      return jsonError(
        400,
        "Image too large after compression (max 4 MB). Compress on the client first.",
        "bad_request",
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffAllowedMime(bytes);
    if (!sniffed || !ALLOWED_OCR_MIME.has(sniffed)) {
      return jsonError(
        400,
        "Only compressed images are accepted (JPEG, PNG, WebP, HEIC).",
        "bad_request",
      );
    }

    let ocr;
    try {
      ocr = await extractInvoiceFromImage({
        bytes,
        mimeType: sniffed,
      });
    } catch (error) {
      const message =
        error instanceof OcrExtractionError
          ? error.message
          : "OCR extraction failed.";
      return jsonError(422, message, "ocr_failed");
    }

    let document;
    try {
      document = await persistOcrInvoice({
        vehicleId: meta.data.vehicleId,
        userId: user.id,
        bytes,
        mimeType: sniffed,
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

    if (meta.data.tagUuid) {
      revalidatePath(`/v/${meta.data.tagUuid}`);
      revalidatePath(`/v/${meta.data.tagUuid}/dokumente`);
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
    console.error("[api/ocr] unexpected", error);
    return jsonError(500, "OCR request failed.", "storage_failed");
  }
}
