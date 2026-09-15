import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { stageVaultUploadCore } from "@/lib/documents/stage-vault-upload-core";
import type { StageVaultDocumentResult } from "@/lib/documents/vault-document";
import {
  FREE_SCAN_EXHAUSTED_CODE,
  SUBSCRIPTION_REQUIRED_CODE,
} from "@/lib/permissions/feature-access";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireWritableApiUser,
} from "@/lib/security/api-guard";
import {
  isUploadFile,
  validateDocumentUpload,
} from "@/lib/security/file-upload";
import { logServerError } from "@/lib/security/public-error";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 12 * 1024 * 1024;

const metaSchema = z
  .object({
    vehicleId: z.string().uuid(),
    tagUuid: z.string().trim().min(1).max(128),
  })
  .strict();

function isMultipartParseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("unexpected end of form") ||
    message.includes("multipart")
  );
}

function jsonFromStageResult(
  result: StageVaultDocumentResult,
  status = 200,
): NextResponse {
  if (result.status === "staged") {
    return NextResponse.json(
      {
        ok: true as const,
        documentId: result.documentId,
        fileUrl: result.fileUrl,
        tagUuid: result.tagUuid,
      },
      { status },
    );
  }
  if (result.status === "forbidden") {
    return NextResponse.json(
      {
        ok: false as const,
        error: result.message,
        code:
          result.code === SUBSCRIPTION_REQUIRED_CODE
            ? "subscription_required"
            : result.code === FREE_SCAN_EXHAUSTED_CODE
              ? "free_scan_exhausted"
              : "forbidden",
      },
      { status: 403 },
    );
  }
  return NextResponse.json(
    {
      ok: false as const,
      error: result.message,
      code: "bad_request",
    },
    { status: 400 },
  );
}

/**
 * POST /api/documents/vault-stage
 *
 * Multipart: vehicleId, tagUuid, file (PDF) — Gutachten Tresor staging upload.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const limited = await enforceRateLimit(request, "upload", "vault-stage");
    if (limited) return limited;

    const auth = await requireWritableApiUser();
    if (!auth.ok) return auth.response;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      logServerError("[vault-stage] formData parse failed", error);
      const hint = isMultipartParseError(error)
        ? "Upload unterbrochen oder Datei zu groß — bitte kleinere PDF, stabiles WLAN oder Seite neu laden."
        : "Upload konnte nicht gelesen werden.";
      return NextResponse.json(
        { ok: false as const, error: hint, code: "bad_request" },
        { status: 400 },
      );
    }

    const metaParsed = metaSchema.safeParse({
      vehicleId: String(formData.get("vehicleId") ?? "").trim(),
      tagUuid: String(formData.get("tagUuid") ?? "").trim(),
    });
    if (!metaParsed.success) {
      return NextResponse.json(
        {
          ok: false as const,
          error: "Ungültige Upload-Daten.",
          code: "bad_request",
        },
        { status: 400 },
      );
    }

    const file = formData.get("file");
    if (!isUploadFile(file) || file.size === 0) {
      return NextResponse.json(
        {
          ok: false as const,
          error: "Bitte eine Datei auswählen.",
          code: "bad_request",
        },
        { status: 400 },
      );
    }

    const fileCheck = await validateDocumentUpload(file, {
      pdfOnly: true,
      maxBytes: MAX_BYTES,
    });
    if (!fileCheck.ok) {
      return NextResponse.json(
        { ok: false as const, error: fileCheck.error, code: "bad_request" },
        { status: 400 },
      );
    }

    const result = await stageVaultUploadCore(
      metaParsed.data.vehicleId,
      metaParsed.data.tagUuid,
      fileCheck,
    );

    return jsonFromStageResult(result);
  } catch (error) {
    logServerError("[vault-stage] unexpected", error);
    return NextResponse.json(
      {
        ok: false as const,
        error: "Upload fehlgeschlagen.",
        code: "server_error",
      },
      { status: 500 },
    );
  }
}
