import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { enforceRateLimit } from "@/lib/security/api-guard";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import {
  ENGINE_SOUND_BUCKET,
  engineSoundContentTypeFromPath,
  resolveStoredEngineSoundPath,
  vehicleEngineSoundCandidatePaths,
} from "@/lib/vehicles/engine-sound-constants";

export const runtime = "nodejs";

const vehicleIdSchema = z.string().uuid();

async function downloadFirstExisting(
  vehicleId: string,
  preferredPath: string | null,
) {
  const admin = createAdminClient();
  const paths = [
    preferredPath,
    ...vehicleEngineSoundCandidatePaths(vehicleId),
  ].filter((path, index, all): path is string => {
    return Boolean(path) && all.indexOf(path) === index;
  });

  for (const path of paths) {
    const { data, error } = await admin.storage
      .from(ENGINE_SOUND_BUCKET)
      .download(path);
    if (!error && data) return { data, path };
  }
  return null;
}

/**
 * Public showcase engine sound — only when the vehicle profile is public.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ vehicleId: string }> },
) {
  const limited = await enforceRateLimit(
    request,
    "apiDefault",
    "public-vehicle-engine-sound",
  );
  if (limited) return limited;

  const { vehicleId: rawVehicleId } = await context.params;
  const vehicleParsed = vehicleIdSchema.safeParse(rawVehicleId);
  if (!vehicleParsed.success) {
    return NextResponse.json({ error: "Invalid vehicle id." }, { status: 400 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Storage not configured." }, { status: 503 });
  }

  const vehicleId = vehicleParsed.data;

  try {
    const admin = createAdminClient();
    const { data: vehicle, error: vehicleError } = await admin
      .from("vehicles")
      .select("is_public, sound_url")
      .eq("id", vehicleId)
      .maybeSingle();

    if (vehicleError || !vehicle || !vehicle.is_public) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const preferredPath = resolveStoredEngineSoundPath(
      vehicleId,
      vehicle.sound_url,
    );
    if (!preferredPath) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const found = await downloadFirstExisting(vehicleId, preferredPath);
    if (!found) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const buffer = Buffer.from(await found.data.arrayBuffer());
    const storedType = found.data.type?.split(";")[0]?.trim().toLowerCase() ?? "";
    const allowed = [
      "audio/mpeg",
      "audio/mp4",
      "audio/x-m4a",
      "audio/wav",
      "audio/x-wav",
    ];
    const contentType = allowed.includes(storedType)
      ? storedType
      : engineSoundContentTypeFromPath(found.path);
    const filename = (found.path.split("/").pop() ?? "engine-sound").replace(
      /[^\w.-]/g,
      "_",
    );

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
