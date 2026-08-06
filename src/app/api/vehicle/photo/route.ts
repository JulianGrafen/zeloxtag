import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  enforceRateLimit,
  enforceSameOrigin,
  requireApiUser,
} from "@/lib/security/api-guard";
import { sniffAllowedMime } from "@/lib/security/file-upload";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  ensureVehicleSilhouetteBucket,
  isStorageMimeRejected,
} from "@/lib/vehicles/ensure-silhouette-bucket";
import {
  HeaderPhotoNormalizeError,
  normalizeVehicleHeaderPhoto,
} from "@/lib/vehicles/normalize-vehicle-header-photo";
import {
  MAX_SILHOUETTE_UPLOAD_BYTES,
  SILHOUETTE_BUCKET,
  vehiclePhotoObjectPath,
} from "@/lib/vehicles/silhouette-constants";
import { silhouetteDisplayUrl } from "@/lib/vehicles/silhouette-display-url";
import { isPngBytes } from "@/lib/vehicles/silhouette-bytes";
import { verifySilhouetteInStorage } from "@/lib/vehicles/verify-silhouette-storage";

export const runtime = "nodejs";
export const maxDuration = 60;

const metaSchema = z
  .object({
    vehicleId: z.string().uuid(),
    tagUuid: z.string().trim().min(1).max(128).optional(),
  })
  .strict();

const ALLOWED_INPUT_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function jsonError(status: number, error: string, code: string) {
  return NextResponse.json({ ok: false as const, error, code }, { status });
}

function asImageBlob(
  value: FormDataEntryValue | null,
): { blob: Blob; filename: string } | null {
  if (value instanceof File && value.size > 0) {
    return { blob: value, filename: value.name || "vehicle-photo.jpg" };
  }
  if (typeof Blob !== "undefined" && value instanceof Blob && value.size > 0) {
    const named = value as Blob & { name?: string };
    return {
      blob: value,
      filename:
        typeof named.name === "string" && named.name.length > 0
          ? named.name
          : "vehicle-photo.jpg",
    };
  }
  return null;
}

/**
 * POST /api/vehicle/photo
 * Auth → store owner vehicle photo for the dashboard header.
 */
export async function POST(request: NextRequest) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const limited = await enforceRateLimit(request, "upload", "vehicle-photo");
    if (limited) return limited;

    const { isConfigured } = getSupabaseEnv();
    if (!isConfigured || !isSupabaseAdminConfigured()) {
      return jsonError(
        503,
        "Supabase is not configured for vehicle photo uploads.",
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
      console.error("[vehicle-photo] formData parse failed", error);
      return jsonError(
        400,
        "Upload konnte nicht gelesen werden — bitte kleineres Foto wählen oder Seite neu laden.",
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

    const upload =
      asImageBlob(formData.get("file")) ??
      asImageBlob(formData.get("image")) ??
      asImageBlob(formData.get("photo"));
    if (!upload) {
      return jsonError(
        400,
        "Keine Bilddatei erhalten — bitte erneut aus Galerie oder Kamera wählen.",
        "bad_request",
      );
    }
    if (upload.blob.size > MAX_SILHOUETTE_UPLOAD_BYTES) {
      return jsonError(413, "Image exceeds 8 MB limit.", "payload_too_large");
    }

    const bytes = new Uint8Array(await upload.blob.arrayBuffer());
    const sniffed = sniffAllowedMime(bytes);
    if (!sniffed || !ALLOWED_INPUT_MIME.has(sniffed)) {
      return jsonError(
        415,
        "Unsupported image type. Use JPEG, PNG, or WebP.",
        "unsupported_media",
      );
    }

    const admin = createAdminClient();
    const { data: vehicle, error: vehicleError } = await admin
      .from("vehicles")
      .select("id, user_id")
      .eq("id", vehicleId)
      .maybeSingle();

    if (vehicleError) {
      return jsonError(500, "Could not verify vehicle ownership.", "db_error");
    }
    if (!vehicle || vehicle.user_id !== user.id) {
      return jsonError(403, "Not allowed for this vehicle.", "forbidden");
    }

    let photoPng: Buffer;
    try {
      photoPng = await normalizeVehicleHeaderPhoto(bytes);
    } catch (error) {
      if (error instanceof HeaderPhotoNormalizeError) {
        return jsonError(422, error.message, "normalize_failed");
      }
      throw error;
    }

    const pngBytes = new Uint8Array(photoPng);
    if (!isPngBytes(pngBytes)) {
      console.error("[vehicle-photo] normalize did not produce PNG bytes");
      return jsonError(
        500,
        "Foto konnte nicht verarbeitet werden — bitte anderes Bild wählen.",
        "normalize_failed",
      );
    }

    await ensureVehicleSilhouetteBucket(admin);

    const objectPath = vehiclePhotoObjectPath(vehicleId);

    async function storePhoto(): Promise<string | null> {
      const { error: uploadError } = await admin.storage
        .from(SILHOUETTE_BUCKET)
        .upload(objectPath, photoPng, {
          contentType: "image/png",
          upsert: true,
          cacheControl: "3600",
        });

      if (!uploadError) return null;

      console.error("[vehicle-photo] storage upload failed", uploadError);
      return uploadError.message;
    }

    let storageError = await storePhoto();
    if (storageError && isStorageMimeRejected(storageError)) {
      await ensureVehicleSilhouetteBucket(admin);
      storageError = await storePhoto();
    }

    if (storageError) {
      const friendly = isStorageMimeRejected(storageError)
        ? "Speicher lehnt das Foto-Format ab — bitte in 1 Minute erneut versuchen."
        : `Could not store vehicle photo: ${storageError}`;
      return jsonError(500, friendly, "storage_error");
    }

    const {
      data: { publicUrl },
    } = admin.storage.from(SILHOUETTE_BUCKET).getPublicUrl(objectPath);

    const cacheBust = Date.now();
    const silhouetteUrl = `${publicUrl}?v=${cacheBust}`;
    const displayUrl = silhouetteDisplayUrl(vehicleId, cacheBust);

    const { error: updateError } = await admin
      .from("vehicles")
      .update({
        silhouette_image_url: silhouetteUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", vehicleId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[vehicle-photo] vehicle update failed", updateError);
      return jsonError(
        500,
        `Could not save vehicle photo URL: ${updateError.message}`,
        "db_error",
      );
    }

    const storageReady = await verifySilhouetteInStorage(admin, vehicleId);
    if (!storageReady) {
      console.warn(
        "[vehicle-photo] photo not readable immediately after upload",
        vehicleId,
      );
    }

    if (tagUuid) {
      revalidatePath(`/v/${tagUuid}`, "page");
      revalidatePath(`/v/${tagUuid}/daten`, "page");
    }

    return NextResponse.json({
      ok: true as const,
      silhouetteImageUrl: silhouetteUrl,
      silhouetteDisplayUrl: displayUrl,
    });
  } catch (error) {
    console.error("[vehicle-photo] unexpected", error);
    return jsonError(
      500,
      error instanceof Error ? error.message : "Unexpected server error.",
      "internal",
    );
  }
}
