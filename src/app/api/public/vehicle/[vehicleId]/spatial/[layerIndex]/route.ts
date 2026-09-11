import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { enforceRateLimit } from "@/lib/security/api-guard";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import {
  parseVehicleSpatialSceneMeta,
  SPATIAL_LAYER_COUNT,
  SPATIAL_SCENE_BUCKET,
} from "@/lib/vehicles/spatial-scene-constants";

export const runtime = "nodejs";

const vehicleIdSchema = z.string().uuid();
const layerIndexSchema = z.coerce.number().int().min(0).max(SPATIAL_LAYER_COUNT - 1);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ vehicleId: string; layerIndex: string }> },
) {
  const limited = await enforceRateLimit(
    request,
    "apiDefault",
    "public-vehicle-spatial-layer",
  );
  if (limited) return limited;

  const { vehicleId: rawVehicleId, layerIndex: rawLayerIndex } =
    await context.params;
  const vehicleParsed = vehicleIdSchema.safeParse(rawVehicleId);
  const layerParsed = layerIndexSchema.safeParse(rawLayerIndex);
  if (!vehicleParsed.success || !layerParsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Storage not configured." }, { status: 503 });
  }

  const vehicleId = vehicleParsed.data;
  const layerIndex = layerParsed.data;

  try {
    const admin = createAdminClient();
    const { data: vehicle, error: vehicleError } = await admin
      .from("vehicles")
      .select("is_public, spatial_scene")
      .eq("id", vehicleId)
      .maybeSingle();

    if (vehicleError || !vehicle || !vehicle.is_public) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const meta = parseVehicleSpatialSceneMeta(vehicle.spatial_scene);
    const objectPath = meta?.layers[layerIndex];
    if (!objectPath) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data, error } = await admin.storage
      .from(SPATIAL_SCENE_BUCKET)
      .download(objectPath);

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="spatial-layer-${layerIndex}.png"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
