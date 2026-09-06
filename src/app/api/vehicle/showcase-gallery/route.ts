import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { DOCUMENT_BUCKET, MAX_DOCUMENT_BYTES } from "@/lib/documents/constants";
import {
  MAX_SHOWCASE_GALLERY_PHOTOS,
  SHOWCASE_GALLERY_CATEGORY,
  SHOWCASE_GALLERY_MARKER,
} from "@/lib/documents/showcase-gallery";
import { documentStorageObjectPath } from "@/lib/documents/storage-path";
import { normalizeHeicUploadBytes } from "@/lib/image/convert-heic-to-jpeg";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireApiUser,
} from "@/lib/security/api-guard";
import {
  isUploadFile,
  validateDocumentUpload,
} from "@/lib/security/file-upload";
import { logServerError } from "@/lib/security/public-error";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const maxDuration = 60;

const metaSchema = z
  .object({
    vehicleId: z.string().uuid(),
    tagUuid: z.string().trim().min(1).max(128).optional(),
  })
  .strict();

function jsonError(status: number, error: string, code: string) {
  return NextResponse.json({ ok: false as const, error, code }, { status });
}

function revalidateShowcasePaths(tagUuid: string | undefined, publicSlug: string | null) {
  if (tagUuid?.trim()) {
    revalidatePath(`/v/${tagUuid.trim()}`);
    revalidatePath(`/v/${tagUuid.trim()}/einstellungen`);
  }
  const slug = publicSlug?.trim();
  if (slug) {
    revalidatePath(`/v/${slug}`, "page");
  }
}

/**
 * POST /api/vehicle/showcase-gallery
 * Owner uploads a photo for the public showcase gallery (max. 10).
 */
export async function POST(request: NextRequest) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const limited = await enforceRateLimit(
      request,
      "upload",
      "vehicle-showcase-gallery",
    );
    if (limited) return limited;

    const { isConfigured } = getSupabaseEnv();
    if (!isConfigured) {
      return jsonError(
        503,
        "Supabase ist für Galerie-Uploads nicht konfiguriert.",
        "config",
      );
    }

    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error("[vehicle-showcase-gallery] formData parse failed", error);
      return jsonError(
        400,
        "Upload konnte nicht gelesen werden — bitte kleinere Datei wählen oder Seite neu laden.",
        "bad_request",
      );
    }

    const rawVehicleId = formData.get("vehicleId");
    const rawTagUuid = formData.get("tagUuid");
    const metaParsed = metaSchema.safeParse({
      vehicleId:
        typeof rawVehicleId === "string" ? rawVehicleId.trim() : rawVehicleId,
      tagUuid:
        typeof rawTagUuid === "string" && rawTagUuid.trim()
          ? rawTagUuid.trim()
          : undefined,
    });
    if (!metaParsed.success) {
      return jsonError(
        400,
        "Fahrzeug konnte nicht erkannt werden — bitte Seite neu laden.",
        "bad_request",
      );
    }
    const { vehicleId, tagUuid } = metaParsed.data;

    const file = formData.get("file");
    if (!isUploadFile(file)) {
      return jsonError(
        400,
        "Keine Datei erhalten — bitte Foto erneut auswählen.",
        "bad_request",
      );
    }

    const fileCheck = await validateDocumentUpload(file, { pdfOnly: false });
    if (!fileCheck.ok) {
      return jsonError(415, fileCheck.error, "unsupported_media");
    }

    if (fileCheck.mime === "application/pdf") {
      return jsonError(
        415,
        "Nur Fotos (JPEG, PNG, WebP, HEIC) werden unterstützt.",
        "unsupported_media",
      );
    }

    if (fileCheck.size > MAX_DOCUMENT_BYTES) {
      return jsonError(
        413,
        `Datei zu groß (max. ${Math.round(MAX_DOCUMENT_BYTES / (1024 * 1024))} MB).`,
        "payload_too_large",
      );
    }

    const supabase = await createClient();
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id, user_id, public_slug")
      .eq("id", vehicleId)
      .maybeSingle();

    if (vehicleError) {
      return jsonError(500, "Fahrzeug konnte nicht geprüft werden.", "db_error");
    }
    if (!vehicle || vehicle.user_id !== user.id) {
      return jsonError(403, "Nur der Fahrzeughalter darf hochladen.", "forbidden");
    }

    const { count, error: countError } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("vehicle_id", vehicleId)
      .eq("invoice_number", SHOWCASE_GALLERY_MARKER);

    if (countError) {
      return jsonError(500, "Galerie konnte nicht geprüft werden.", "db_error");
    }
    if ((count ?? 0) >= MAX_SHOWCASE_GALLERY_PHOTOS) {
      return jsonError(
        409,
        `Maximal ${MAX_SHOWCASE_GALLERY_PHOTOS} Fotos in der Showcase-Galerie.`,
        "limit_reached",
      );
    }

    const documentId = randomUUID();
    const rawBytes = Buffer.from(fileCheck.bytes);
    let uploadMime = fileCheck.mime;
    let uploadBytes: Buffer = rawBytes;

    try {
      const normalized = await normalizeHeicUploadBytes(rawBytes, fileCheck.mime);
      uploadMime = normalized.mime as typeof fileCheck.mime;
      uploadBytes = normalized.bytes;
    } catch {
      return jsonError(
        415,
        "HEIC konnte nicht gelesen werden. Bitte JPEG, PNG oder WebP wählen.",
        "unsupported_media",
      );
    }

    const storagePath = documentStorageObjectPath(
      vehicleId,
      documentId,
      fileCheck.safeName,
    );

    const { error: uploadError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(storagePath, uploadBytes, {
        contentType: uploadMime,
        upsert: false,
      });

    if (uploadError) {
      console.error("[vehicle-showcase-gallery] storage upload failed", uploadError);
      return jsonError(
        500,
        `Foto konnte nicht gespeichert werden: ${uploadError.message}`,
        "storage_error",
      );
    }

    const now = new Date().toISOString();
    const title = `Galerie ${(count ?? 0) + 1}`;
    const row = {
      id: documentId,
      vehicle_id: vehicleId,
      user_id: user.id,
      created_by: user.id,
      title,
      type: "other" as const,
      file_url: storagePath,
      category: SHOWCASE_GALLERY_CATEGORY,
      invoice_number: SHOWCASE_GALLERY_MARKER,
      show_on_public_showcase: true,
      page_count: 1,
      date: now.slice(0, 10),
    };

    const insertAttempts = [
      row,
      { ...row, created_by: undefined },
      {
        id: row.id,
        vehicle_id: row.vehicle_id,
        user_id: row.user_id,
        title: row.title,
        type: row.type,
        file_url: row.file_url,
        category: row.category,
        invoice_number: row.invoice_number,
        page_count: row.page_count,
        date: row.date,
      },
    ] as const;

    let lastError: string | null = null;
    for (const attempt of insertAttempts) {
      const { error } = await supabase.from("documents").insert({ ...attempt });
      if (!error) {
        revalidateShowcasePaths(tagUuid, vehicle.public_slug);
        return NextResponse.json({
          ok: true as const,
          documentId,
          fileUrl: storagePath,
        });
      }
      lastError = error.message;
    }

    await supabase.storage
      .from(DOCUMENT_BUCKET)
      .remove([storagePath])
      .catch(() => undefined);

    logServerError("[vehicle-showcase-gallery] insert failed", {
      lastError,
      documentId,
    });
    return jsonError(500, "Speichern fehlgeschlagen.", "db_error");
  } catch (error) {
    logServerError("[vehicle-showcase-gallery] POST failed", error);
    return jsonError(500, "Upload fehlgeschlagen.", "internal_error");
  }
}
