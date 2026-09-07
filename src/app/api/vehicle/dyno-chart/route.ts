import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { MAX_DOCUMENT_BYTES } from "@/lib/documents/constants";
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
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  DYNO_CHART_BUCKET,
  ownerDynoChartDisplayPath,
  vehicleDynoChartCandidatePaths,
  vehicleDynoChartObjectPath,
} from "@/lib/vehicles/dyno-chart-constants";
import {
  parseVehicleTechSpecs,
  serializeVehicleTechSpecs,
} from "@/lib/vehicles/tech-specs";
import { normalizeHeicUploadBytes } from "@/lib/image/convert-heic-to-jpeg";

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

function asUploadBlob(
  value: FormDataEntryValue | null,
): { blob: Blob; filename: string } | null {
  if (value instanceof File && value.size > 0) {
    return { blob: value, filename: value.name || "leistungsdiagramm" };
  }
  if (typeof Blob !== "undefined" && value instanceof Blob && value.size > 0) {
    const named = value as Blob & { name?: string };
    return {
      blob: value,
      filename:
        typeof named.name === "string" && named.name.length > 0
          ? named.name
          : "leistungsdiagramm",
    };
  }
  return null;
}

function uploadFileFromFormData(formData: FormData): File | null {
  const upload =
    asUploadBlob(formData.get("file")) ??
    asUploadBlob(formData.get("dynoChart")) ??
    asUploadBlob(formData.get("document"));
  if (!upload) return null;

  if (upload.blob instanceof File) {
    return upload.blob;
  }

  return new File([upload.blob], upload.filename, {
    type: upload.blob.type || "application/octet-stream",
    lastModified: Date.now(),
  });
}

async function normalizeDynoUpload(
  mime: string,
  bytes: Buffer,
): Promise<
  | { ok: true; mime: string; bytes: Buffer }
  | { ok: false; error: string }
> {
  try {
    const normalized = await normalizeHeicUploadBytes(bytes, mime);
    return { ok: true, mime: normalized.mime, bytes: normalized.bytes };
  } catch {
    return {
      ok: false,
      error: "HEIC konnte nicht gelesen werden. Bitte JPEG, PNG oder PDF wählen.",
    };
  }
}

/**
 * POST /api/vehicle/dyno-chart
 * Owner uploads a dyno / Leistungsdiagramm as PDF or image.
 */
export async function POST(request: NextRequest) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const limited = await enforceRateLimit(
      request,
      "upload",
      "vehicle-dyno-chart",
    );
    if (limited) return limited;

    const { isConfigured } = getSupabaseEnv();
    if (!isConfigured) {
      return jsonError(
        503,
        "Supabase ist für Leistungsdiagramm-Uploads nicht konfiguriert.",
        "config",
      );
    }

    const auth = await requireWritableApiUser();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error("[vehicle-dyno-chart] formData parse failed", error);
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

    const file = uploadFileFromFormData(formData);
    if (!file || !isUploadFile(file)) {
      return jsonError(
        400,
        "Keine Datei erhalten — bitte Foto oder PDF erneut auswählen.",
        "bad_request",
      );
    }

    const fileCheck = await validateDocumentUpload(file);
    if (!fileCheck.ok) {
      return jsonError(415, fileCheck.error, "unsupported_media");
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
      .select("id, user_id, tech_specs, public_slug")
      .eq("id", vehicleId)
      .maybeSingle();

    if (vehicleError) {
      return jsonError(500, "Fahrzeug konnte nicht geprüft werden.", "db_error");
    }
    if (!vehicle || vehicle.user_id !== user.id) {
      return jsonError(403, "Nur der Fahrzeughalter darf hochladen.", "forbidden");
    }

    const rawBytes = Buffer.from(fileCheck.bytes);
    const normalized = await normalizeDynoUpload(fileCheck.mime, rawBytes);
    if (!normalized.ok) {
      return jsonError(415, normalized.error, "unsupported_media");
    }

    const objectPath = vehicleDynoChartObjectPath(vehicleId, normalized.mime);

    const { error: uploadError } = await supabase.storage
      .from(DYNO_CHART_BUCKET)
      .upload(objectPath, normalized.bytes, {
        contentType: normalized.mime,
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("[vehicle-dyno-chart] storage upload failed", uploadError);
      return jsonError(
        500,
        `Leistungsdiagramm konnte nicht gespeichert werden: ${uploadError.message}`,
        "storage_error",
      );
    }

    const stalePaths = vehicleDynoChartCandidatePaths(vehicleId).filter(
      (path) => path !== objectPath,
    );
    if (stalePaths.length > 0) {
      await supabase.storage
        .from(DYNO_CHART_BUCKET)
        .remove(stalePaths)
        .catch(() => undefined);
    }

    const cacheBust = Date.now();
    const currentSpecs = parseVehicleTechSpecs(vehicle.tech_specs);
    const techSpecs = serializeVehicleTechSpecs({
      ...currentSpecs,
      dynoChartUrl: objectPath,
    });

    const { error: updateError } = await supabase
      .from("vehicles")
      .update({
        tech_specs: techSpecs,
        updated_at: new Date().toISOString(),
      })
      .eq("id", vehicleId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[vehicle-dyno-chart] vehicle update failed", updateError);
      return jsonError(
        500,
        `Leistungsdiagramm-URL konnte nicht gespeichert werden: ${updateError.message}`,
        "db_error",
      );
    }

    if (tagUuid) {
      revalidatePath(`/v/${tagUuid}`, "page");
      revalidatePath(`/v/${tagUuid}/daten`, "page");
    }
    const publicSlug =
      typeof vehicle.public_slug === "string" ? vehicle.public_slug.trim() : "";
    if (publicSlug) {
      revalidatePath(`/v/${publicSlug}`, "page");
    }

    return NextResponse.json({
      ok: true as const,
      dynoChartUrl: ownerDynoChartDisplayPath(vehicleId, cacheBust),
    });
  } catch (error) {
    logServerError("[vehicle-dyno-chart] unexpected", error);
    return jsonError(
      500,
      "Dyno-Chart konnte nicht gespeichert werden.",
      "internal",
    );
  }
}

async function revalidateDynoChartPaths(
  tagUuid: string | undefined,
  publicSlug: string | null | undefined,
): Promise<void> {
  if (tagUuid) {
    revalidatePath(`/v/${tagUuid}`, "page");
    revalidatePath(`/v/${tagUuid}/daten`, "page");
  }
  const slug = publicSlug?.trim();
  if (slug) {
    revalidatePath(`/v/${slug}`, "page");
  }
}

/**
 * DELETE /api/vehicle/dyno-chart
 * Owner removes the dyno / Leistungsdiagramm.
 */
export async function DELETE(request: NextRequest) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const limited = await enforceRateLimit(
      request,
      "upload",
      "vehicle-dyno-chart-delete",
    );
    if (limited) return limited;

    const { isConfigured } = getSupabaseEnv();
    if (!isConfigured) {
      return jsonError(
        503,
        "Supabase ist für Leistungsdiagramm-Uploads nicht konfiguriert.",
        "config",
      );
    }

    const auth = await requireWritableApiUser();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, "Ungültige Anfrage.", "bad_request");
    }

    const metaParsed = metaSchema.safeParse(body);
    if (!metaParsed.success) {
      return jsonError(
        400,
        "Fahrzeug konnte nicht erkannt werden — bitte Seite neu laden.",
        "bad_request",
      );
    }
    const { vehicleId, tagUuid } = metaParsed.data;

    const supabase = await createClient();
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id, user_id, tech_specs, public_slug")
      .eq("id", vehicleId)
      .maybeSingle();

    if (vehicleError) {
      return jsonError(500, "Fahrzeug konnte nicht geprüft werden.", "db_error");
    }
    if (!vehicle || vehicle.user_id !== user.id) {
      return jsonError(403, "Nur der Fahrzeughalter darf löschen.", "forbidden");
    }

    const currentSpecs = parseVehicleTechSpecs(vehicle.tech_specs);
    if (!currentSpecs.dynoChartUrl?.trim()) {
      return NextResponse.json({ ok: true as const });
    }

    const stalePaths = vehicleDynoChartCandidatePaths(vehicleId);
    if (stalePaths.length > 0) {
      await supabase.storage
        .from(DYNO_CHART_BUCKET)
        .remove(stalePaths)
        .catch(() => undefined);
    }

    const techSpecs = serializeVehicleTechSpecs({
      ...currentSpecs,
      dynoChartUrl: null,
    });

    const { error: updateError } = await supabase
      .from("vehicles")
      .update({
        tech_specs: techSpecs,
        updated_at: new Date().toISOString(),
      })
      .eq("id", vehicleId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[vehicle-dyno-chart] delete update failed", updateError);
      return jsonError(
        500,
        "Leistungsdiagramm konnte nicht entfernt werden.",
        "db_error",
      );
    }

    await revalidateDynoChartPaths(tagUuid, vehicle.public_slug);

    return NextResponse.json({ ok: true as const });
  } catch (error) {
    logServerError("[vehicle-dyno-chart] delete unexpected", error);
    return jsonError(
      500,
      "Leistungsdiagramm konnte nicht entfernt werden.",
      "internal",
    );
  }
}
