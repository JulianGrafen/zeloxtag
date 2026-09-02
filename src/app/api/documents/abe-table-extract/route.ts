import { NextResponse, type NextRequest } from "next/server";

import { isLlmConfigured } from "@/lib/ocr/llm-client";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireApiUser,
} from "@/lib/security/api-guard";
import { validateDocumentUpload } from "@/lib/security/file-upload";
import { requireVehicleOcrAccess } from "@/lib/security/require-vehicle-ocr";
import { FEATURE } from "@/lib/permissions/feature-access";
import { isAbeTableExtractionEmpty } from "@/lib/validations/abeTableExtractionSchemas";
import { abeTableExtractorService } from "@/services/documents/TableExtractorService";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;

type ExtractSuccess = {
  ok: true;
  extraction: {
    vehicles: Array<{
      model_name: string;
      configurations: Array<{
        kw_range: string;
        tire_size: string;
        auflagen_codes: string[];
      }>;
    }>;
  };
  pageCount: number;
  model: string;
  manualFallback: boolean;
};

type ExtractError = {
  ok: false;
  error: string;
  code: "unauthorized" | "bad_request" | "config" | "rate_limited";
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
 * POST /api/documents/abe-table-extract
 *
 * Vision-LLM extraction of merged-cell ABE vehicle compatibility tables.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const limited = await enforceRateLimit(request, "ocr", "abe-table-extract");
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
      return jsonError(400, "Multipart-Upload erwartet.", "bad_request");
    }

    const vehicleAccess = await requireVehicleOcrAccess(
      auth.user.id,
      String(formData.get("vehicleId") ?? ""),
      FEATURE.SCAN_AI_RECEIPT,
      "abe",
    );
    if (!vehicleAccess.ok) return vehicleAccess.response;

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

    if (pdfUploads.length === 1) {
      const pdf = pdfUploads[0]!;
      const validated = await validateDocumentUpload(pdf, {
        maxBytes: MAX_BYTES,
        pdfOnly: true,
      });
      if (!validated.ok) {
        return jsonError(400, validated.error, "bad_request");
      }

      const bytes = Buffer.from(validated.bytes);
      const result = await abeTableExtractorService.extract({
        kind: "pdf",
        bytes,
      });

      const body: ExtractSuccess = {
        ok: true,
        extraction: result.extraction,
        pageCount: result.pageCount,
        model: result.model,
        manualFallback: isAbeTableExtractionEmpty(result.extraction),
      };
      return NextResponse.json(body);
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

    const result = await abeTableExtractorService.extract({
      kind: "images",
      files: imageFiles,
    });

    const body: ExtractSuccess = {
      ok: true,
      extraction: result.extraction,
      pageCount: result.pageCount,
      model: result.model,
      manualFallback: isAbeTableExtractionEmpty(result.extraction),
    };
    return NextResponse.json(body);
  } catch (error) {
    console.error("[abe-table-extract]", error);
    return jsonError(500, "Tabellen-Extraktion fehlgeschlagen.", "bad_request");
  }
}
