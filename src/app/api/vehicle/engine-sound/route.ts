import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  enforceRateLimit,
  enforceSameOrigin,
  requireWritableApiUser,
} from "@/lib/security/api-guard";
import { isUploadFile } from "@/lib/security/file-upload";
import { logServerError } from "@/lib/security/public-error";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  ENGINE_SOUND_BUCKET,
  ownerEngineSoundDisplayPath,
  resolveStoredEngineSoundPath,
  vehicleEngineSoundCandidatePaths,
  vehicleEngineSoundObjectPath,
} from "@/lib/vehicles/engine-sound-constants";
import { validateEngineSoundMeta } from "@/lib/vehicles/engine-sound-validation";

export const runtime = "nodejs";
export const maxDuration = 60;

const metaSchema = z
  .object({
    vehicleId: z.string().uuid(),
    tagUuid: z.string().trim().min(1).max(128).optional(),
    durationSeconds: z.coerce.number().positive().max(10),
  })
  .strict();

const deleteSchema = z
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
    return { blob: value, filename: value.name || "engine-sound" };
  }
  if (typeof Blob !== "undefined" && value instanceof Blob && value.size > 0) {
    const named = value as Blob & { name?: string };
    return {
      blob: value,
      filename:
        typeof named.name === "string" && named.name.length > 0
          ? named.name
          : "engine-sound",
    };
  }
  return null;
}

function uploadFileFromFormData(formData: FormData): File | null {
  const upload =
    asUploadBlob(formData.get("file")) ??
    asUploadBlob(formData.get("sound")) ??
    asUploadBlob(formData.get("audio"));
  if (!upload) return null;

  if (upload.blob instanceof File) {
    return upload.blob;
  }

  return new File([upload.blob], upload.filename, {
    type: upload.blob.type || "application/octet-stream",
    lastModified: Date.now(),
  });
}

function optionalTagUuid(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

async function revalidateEngineSoundPaths(
  tagUuid: string | undefined,
  publicSlug: string | null | undefined,
): Promise<void> {
  if (tagUuid) {
    revalidatePath(`/v/${tagUuid}`, "page");
    revalidatePath(`/v/${tagUuid}/einstellungen`, "page");
  }
  const slug = publicSlug?.trim();
  if (slug) {
    revalidatePath(`/v/${slug}`, "page");
  }
  revalidatePath("/dev/showroom", "page");
}

export async function POST(request: NextRequest) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const limited = await enforceRateLimit(
      request,
      "upload",
      "vehicle-engine-sound",
    );
    if (limited) return limited;

    const { isConfigured } = getSupabaseEnv();
    if (!isConfigured) {
      return jsonError(
        503,
        "Supabase ist für Soundcheck-Uploads nicht konfiguriert.",
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
      console.error("[vehicle-engine-sound] formData parse failed", error);
      return jsonError(
        400,
        "Upload konnte nicht gelesen werden — Datei kleiner als 2 MB und als MP3, M4A oder WAV erneut versuchen.",
        "bad_request",
      );
    }

    const metaParsed = metaSchema.safeParse({
      vehicleId: formData.get("vehicleId"),
      tagUuid: optionalTagUuid(formData.get("tagUuid")),
      durationSeconds: formData.get("durationSeconds"),
    });
    if (!metaParsed.success) {
      return jsonError(
        400,
        "Ungültige Upload-Daten — max. 10 Sekunden, MP3, M4A oder WAV.",
        "bad_request",
      );
    }
    const { vehicleId, tagUuid, durationSeconds } = metaParsed.data;

    const file = uploadFileFromFormData(formData);
    if (!file || !isUploadFile(file)) {
      return jsonError(400, "Keine Audiodatei erhalten.", "bad_request");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const validated = validateEngineSoundMeta(
      file.type,
      file.name,
      bytes.byteLength,
      durationSeconds,
    );
    if (!validated.ok) {
      return jsonError(415, validated.error, "unsupported_media");
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

    const objectPath = vehicleEngineSoundObjectPath(vehicleId, validated.mime);

    const { error: uploadError } = await supabase.storage
      .from(ENGINE_SOUND_BUCKET)
      .upload(objectPath, bytes, {
        contentType: validated.mime,
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("[vehicle-engine-sound] storage upload failed", uploadError);
      return jsonError(
        500,
        "Engine-Sound konnte nicht gespeichert werden.",
        "storage_error",
      );
    }

    const stalePaths = vehicleEngineSoundCandidatePaths(vehicleId).filter(
      (path) => path !== objectPath,
    );
    if (stalePaths.length > 0) {
      await supabase.storage
        .from(ENGINE_SOUND_BUCKET)
        .remove(stalePaths)
        .catch(() => undefined);
    }

    const { error: updateError } = await supabase
      .from("vehicles")
      .update({
        sound_url: objectPath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", vehicleId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[vehicle-engine-sound] vehicle update failed", updateError);
      return jsonError(500, "Sound-URL konnte nicht gespeichert werden.", "db_error");
    }

    await revalidateEngineSoundPaths(tagUuid, vehicle.public_slug);

    return NextResponse.json({
      ok: true as const,
      soundUrl: ownerEngineSoundDisplayPath(vehicleId, Date.now()),
    });
  } catch (error) {
    logServerError("[vehicle-engine-sound] unexpected", error);
    return jsonError(500, "Engine-Sound konnte nicht gespeichert werden.", "internal");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    const limited = await enforceRateLimit(
      request,
      "apiDefault",
      "vehicle-engine-sound-delete",
    );
    if (limited) return limited;

    const auth = await requireWritableApiUser();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, "Ungültige Anfrage.", "bad_request");
    }

    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, "Ungültige Anfrage.", "bad_request");
    }
    const { vehicleId, tagUuid } = parsed.data;

    const supabase = await createClient();
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id, user_id, sound_url, public_slug")
      .eq("id", vehicleId)
      .maybeSingle();

    if (vehicleError) {
      return jsonError(500, "Fahrzeug konnte nicht geprüft werden.", "db_error");
    }
    if (!vehicle || vehicle.user_id !== user.id) {
      return jsonError(403, "Nur der Fahrzeughalter darf löschen.", "forbidden");
    }

    const storedPath = resolveStoredEngineSoundPath(vehicleId, vehicle.sound_url);
    if (storedPath) {
      await supabase.storage
        .from(ENGINE_SOUND_BUCKET)
        .remove([storedPath])
        .catch(() => undefined);
    }

    const { error: updateError } = await supabase
      .from("vehicles")
      .update({
        sound_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", vehicleId)
      .eq("user_id", user.id);

    if (updateError) {
      return jsonError(500, "Sound konnte nicht entfernt werden.", "db_error");
    }

    await revalidateEngineSoundPaths(tagUuid, vehicle.public_slug);

    return NextResponse.json({ ok: true as const });
  } catch (error) {
    logServerError("[vehicle-engine-sound] delete failed", error);
    return jsonError(500, "Sound konnte nicht entfernt werden.", "internal");
  }
}
