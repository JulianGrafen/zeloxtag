import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import { enforceRateLimit } from "@/lib/security/api-guard";
import { storagePathFromPublicOrAuthenticatedUrl } from "@/lib/security/file-upload";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import {
  DYNO_CHART_BUCKET,
  dynoChartContentTypeFromPath,
  isVehicleDynoChartStoragePath,
  vehicleDynoChartCandidatePaths,
} from "@/lib/vehicles/dyno-chart-constants";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";

export const runtime = "nodejs";

const vehicleIdSchema = z.string().uuid();

async function downloadFirstExisting(
  vehicleId: string,
  preferredPath: string | null,
) {
  const admin = createAdminClient();
  const paths = [
    preferredPath,
    ...vehicleDynoChartCandidatePaths(vehicleId),
  ].filter((path, index, all): path is string => {
    return Boolean(path) && all.indexOf(path) === index;
  });

  for (const path of paths) {
    const { data, error } = await admin.storage
      .from(DYNO_CHART_BUCKET)
      .download(path);
    if (!error && data) return { data, path };
  }
  return null;
}

/**
 * Public showcase dyno file — PDF or image — when the vehicle is public.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ vehicleId: string }> },
) {
  const limited = await enforceRateLimit(
    request,
    "apiDefault",
    "public-vehicle-dyno",
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
      .select("is_public, tech_specs")
      .eq("id", vehicleId)
      .maybeSingle();

    if (vehicleError || !vehicle || !vehicle.is_public) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const storedUrl = parseVehicleTechSpecs(vehicle.tech_specs).dynoChartUrl;
    const fromUrl = storedUrl
      ? storagePathFromPublicOrAuthenticatedUrl(storedUrl, DOCUMENT_BUCKET)
      : null;
    const preferredPath =
      fromUrl &&
      fromUrl.startsWith(`${vehicleId}/`) &&
      isVehicleDynoChartStoragePath(fromUrl)
        ? fromUrl
        : null;

    const found = await downloadFirstExisting(vehicleId, preferredPath);
    if (!found) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const buffer = Buffer.from(await found.data.arrayBuffer());
    const contentType =
      found.data.type?.split(";")[0]?.trim() ||
      dynoChartContentTypeFromPath(found.path);
    const filename = found.path.split("/").pop() ?? "leistungsdiagramm";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
