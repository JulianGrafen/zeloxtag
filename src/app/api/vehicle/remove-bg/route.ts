import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  enforceRateLimit,
  enforceSameOrigin,
  requireApiUser,
} from "@/lib/security/api-guard";
import { sanitizeUploadFilename, sniffAllowedMime } from "@/lib/security/file-upload";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  isRemoveBackgroundConfigured,
  removeImageBackground,
  RemoveBackgroundError,
} from "@/lib/vehicles/remove-background";
import {
  CutoutNormalizeError,
  normalizeVehicleCutout,
} from "@/lib/vehicles/normalize-vehicle-cutout";
import {
  MAX_SILHOUETTE_UPLOAD_BYTES,
  SILHOUETTE_BUCKET,
  silhouetteObjectPath,
} from "@/lib/vehicles/silhouette-constants";

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

/**
 * POST /api/vehicle/remove-bg
 * Auth → validate ownership → BG removal → Storage PNG → update vehicles row.
 */
export async function POST(request: NextRequest) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const limited = await enforceRateLimit(request, "upload", "remove-bg");
    if (limited) return limited;

    const { isConfigured } = getSupabaseEnv();
    if (!isConfigured || !isSupabaseAdminConfigured()) {
      return jsonError(
        503,
        "Supabase is not configured for silhouette uploads.",
        "config",
      );
    }

    if (!isRemoveBackgroundConfigured()) {
      return jsonError(
        503,
        "Background removal is not configured (set PHOTOROOM_API_KEY or REMOVE_BG_API_KEY).",
        "config",
      );
    }

    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonError(400, "Invalid multipart body.", "bad_request");
    }

    const metaParsed = metaSchema.safeParse({
      vehicleId: formData.get("vehicleId"),
      tagUuid: formData.get("tagUuid") || undefined,
    });
    if (!metaParsed.success) {
      return jsonError(400, "Invalid vehicleId.", "bad_request");
    }
    const { vehicleId, tagUuid } = metaParsed.data;

    const file = formData.get("file");
    if (!(file instanceof File) || file.size <= 0) {
      return jsonError(400, "Image file is required.", "bad_request");
    }
    if (file.size > MAX_SILHOUETTE_UPLOAD_BYTES) {
      return jsonError(413, "Image exceeds 8 MB limit.", "payload_too_large");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
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

    let cutoutPng: Buffer;
    try {
      const result = await removeImageBackground({
        bytes,
        mime: sniffed,
        filename: sanitizeUploadFilename(file.name) || "vehicle-side.jpg",
      });
      cutoutPng = await normalizeVehicleCutout(result.pngBytes);
    } catch (error) {
      if (error instanceof RemoveBackgroundError) {
        const status =
          error.code === "config"
            ? 503
            : error.code === "timeout"
              ? 504
              : 502;
        return jsonError(status, error.message, error.code);
      }
      if (error instanceof CutoutNormalizeError) {
        return jsonError(422, error.message, "normalize_failed");
      }
      throw error;
    }

    const objectPath = silhouetteObjectPath(vehicleId);
    const { error: uploadError } = await admin.storage
      .from(SILHOUETTE_BUCKET)
      .upload(objectPath, cutoutPng, {
        contentType: "image/png",
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("[remove-bg] storage upload failed", uploadError);
      return jsonError(500, "Could not store silhouette image.", "storage_error");
    }

    const {
      data: { publicUrl },
    } = admin.storage.from(SILHOUETTE_BUCKET).getPublicUrl(objectPath);

    // Cache-bust so the dashboard shows the latest cutout immediately.
    const silhouetteUrl = `${publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await admin
      .from("vehicles")
      .update({
        silhouette_image_url: silhouetteUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", vehicleId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[remove-bg] vehicle update failed", updateError);
      return jsonError(500, "Could not save silhouette URL.", "db_error");
    }

    if (tagUuid) {
      revalidatePath(`/v/${tagUuid}`);
      revalidatePath(`/v/${tagUuid}/daten`);
    }

    return NextResponse.json({
      ok: true as const,
      silhouetteImageUrl: silhouetteUrl,
    });
  } catch (error) {
    console.error("[remove-bg] unexpected", error);
    return jsonError(500, "Unexpected server error.", "internal");
  }
}
