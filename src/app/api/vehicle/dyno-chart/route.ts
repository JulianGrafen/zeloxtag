import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { MAX_DOCUMENT_BYTES } from "@/lib/documents/constants";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireApiUser,
} from "@/lib/security/api-guard";
import {
  isUploadFile,
  validateDocumentUpload,
} from "@/lib/security/file-upload";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  DYNO_CHART_BUCKET,
  vehicleDynoChartObjectPath,
} from "@/lib/vehicles/dyno-chart-constants";
import {
  parseVehicleTechSpecs,
  serializeVehicleTechSpecs,
} from "@/lib/vehicles/tech-specs";

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

/**
 * POST /api/vehicle/dyno-chart
 * Owner uploads a dyno / Leistungsdiagramm PDF into vehicle tech specs.
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
    if (!isConfigured || !isSupabaseAdminConfigured()) {
      return jsonError(
        503,
        "Supabase ist für Leistungsdiagramm-Uploads nicht konfiguriert.",
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
      console.error("[vehicle-dyno-chart] formData parse failed", error);
      return jsonError(
        400,
        "Upload konnte nicht gelesen werden — bitte kleinere PDF wählen oder Seite neu laden.",
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
        "Keine PDF-Datei erhalten — bitte erneut auswählen.",
        "bad_request",
      );
    }

    const fileCheck = await validateDocumentUpload(file, { pdfOnly: true });
    if (!fileCheck.ok) {
      return jsonError(415, fileCheck.error, "unsupported_media");
    }

    if (fileCheck.size > MAX_DOCUMENT_BYTES) {
      return jsonError(
        413,
        `PDF zu groß (max. ${Math.round(MAX_DOCUMENT_BYTES / (1024 * 1024))} MB).`,
        "payload_too_large",
      );
    }

    const admin = createAdminClient();
    const { data: vehicle, error: vehicleError } = await admin
      .from("vehicles")
      .select("id, user_id, tech_specs")
      .eq("id", vehicleId)
      .maybeSingle();

    if (vehicleError) {
      return jsonError(500, "Fahrzeug konnte nicht geprüft werden.", "db_error");
    }
    if (!vehicle || vehicle.user_id !== user.id) {
      return jsonError(403, "Nur der Fahrzeughalter darf hochladen.", "forbidden");
    }

    const objectPath = vehicleDynoChartObjectPath(vehicleId);
    const pdfBytes = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from(DYNO_CHART_BUCKET)
      .upload(objectPath, pdfBytes, {
        contentType: "application/pdf",
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

    const {
      data: { publicUrl },
    } = admin.storage.from(DYNO_CHART_BUCKET).getPublicUrl(objectPath);

    const cacheBust = Date.now();
    const dynoChartUrl = `${publicUrl}?v=${cacheBust}`;
    const currentSpecs = parseVehicleTechSpecs(vehicle.tech_specs);
    const techSpecs = serializeVehicleTechSpecs({
      ...currentSpecs,
      dynoChartUrl,
    });

    const { error: updateError } = await admin
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

    return NextResponse.json({
      ok: true as const,
      dynoChartUrl,
    });
  } catch (error) {
    console.error("[vehicle-dyno-chart] unexpected", error);
    return jsonError(
      500,
      error instanceof Error ? error.message : "Unexpected server error.",
      "internal",
    );
  }
}
