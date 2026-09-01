import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/get-user";
import { enforceRateLimit } from "@/lib/security/api-guard";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  DYNO_CHART_BUCKET,
  dynoChartContentTypeFromPath,
  resolveStoredDynoChartPath,
  vehicleDynoChartCandidatePaths,
} from "@/lib/vehicles/dyno-chart-constants";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";

export const runtime = "nodejs";

const vehicleIdSchema = z.string().uuid();

/**
 * Session dyno proxy for the private dashboard (owner via Storage RLS).
 * Public showcase guests use `/api/public/vehicle/[vehicleId]/dyno-chart`.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ vehicleId: string }> },
) {
  const limited = await enforceRateLimit(
    request,
    "apiDefault",
    "vehicle-dyno-chart",
  );
  if (limited) return limited;

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return NextResponse.json(
      { error: "Storage not configured." },
      { status: 503 },
    );
  }

  const { vehicleId: rawId } = await context.params;
  const parsed = vehicleIdSchema.safeParse(rawId);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid vehicle id." }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const vehicleId = parsed.data;
  const supabase = await createClient();
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("tech_specs")
    .eq("id", vehicleId)
    .maybeSingle();

  if (!vehicle) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const preferredPath = resolveStoredDynoChartPath(
    vehicleId,
    parseVehicleTechSpecs(vehicle.tech_specs).dynoChartUrl,
  );
  const paths = [
    preferredPath,
    ...vehicleDynoChartCandidatePaths(vehicleId),
  ].filter((path, index, all): path is string => {
    return Boolean(path) && all.indexOf(path) === index;
  });

  for (const path of paths) {
    const { data, error } = await supabase.storage
      .from(DYNO_CHART_BUCKET)
      .download(path);
    if (error || !data) continue;

    const buffer = Buffer.from(await data.arrayBuffer());
    const storedType = data.type?.split(";")[0]?.trim().toLowerCase() ?? "";
    const contentType = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(storedType)
      ? storedType
      : dynoChartContentTypeFromPath(path);
    const filename = (path.split("/").pop() ?? "leistungsdiagramm").replace(
      /[^\w.-]/g,
      "_",
    );

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=300",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
