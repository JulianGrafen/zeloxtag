import { NextResponse, type NextRequest } from "next/server";

import { isLlmConfigured } from "@/lib/ocr/llm-client";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireApiUser,
} from "@/lib/security/api-guard";
import { requireVehicleOcrAccess } from "@/lib/security/require-vehicle-ocr";
import { sniffAllowedMime } from "@/lib/security/file-upload";
import { resolveDocumentContentType } from "@/lib/ocr/document-bytes";
import type { DocumentBytesInput } from "@/lib/ocr/llm-document-content";
import { isTextParseError } from "@/lib/ocr/parse-error";
import {
  vaultClassificationSchema,
  type VaultClassification,
} from "@/lib/validations/vaultClassificationSchema";
import { vaultClassificationService } from "@/services/ocr/VaultClassificationService";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 4 * 1024 * 1024;

type ClassifySuccess = {
  ok: true;
  classification: VaultClassification;
};

type ClassifyError = {
  ok: false;
  error: string;
  code:
    | "unauthorized"
    | "bad_request"
    | "config"
    | "classify_failed"
    | "rate_limited";
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

/**
 * POST /api/ocr/vault-classify
 *
 * Lightweight title + category extraction for the Dokumenten-Tresor.
 * FormData: { vehicleId, file }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const limited = await enforceRateLimit(request, "ocr", "vault-classify");
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
    const sniffed = sniffAllowedMime(new Uint8Array(bytes.subarray(0, 64)));
    if (!sniffed) {
      return jsonError(
        400,
        "Dateityp nicht erkennbar (PDF, JPEG, PNG, WebP, HEIC).",
        "bad_request",
      );
    }

    const documentInput: DocumentBytesInput = {
      bytes,
      contentType: resolveDocumentContentType(bytes, file.type || sniffed),
    };

    const classification = await vaultClassificationService.classifyFromDocument(
      documentInput,
    );
    const validated = vaultClassificationSchema.parse(classification);

    return NextResponse.json({
      ok: true,
      classification: validated,
    } satisfies ClassifySuccess);
  } catch (error) {
    if (isTextParseError(error)) {
      return jsonError(422, error.message, "classify_failed");
    }
    console.error("[vault-classify]", error);
    return jsonError(500, "Klassifizierung fehlgeschlagen.", "classify_failed");
  }
}
