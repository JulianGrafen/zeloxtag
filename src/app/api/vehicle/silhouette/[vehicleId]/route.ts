import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { optimizeWebImageBytes } from "@/lib/image/optimize-web-image";
import { getCurrentUser } from "@/lib/auth/get-user";
import { sessionCanAccessVehicleMedia } from "@/lib/auth/vehicle-access";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { loadVehicleSilhouetteBytes } from "@/lib/vehicles/load-silhouette-bytes";

export const runtime = "nodejs";

const vehicleIdSchema = z.string().uuid();

async function imageResponse(bytes: Uint8Array): Promise<NextResponse> {
  const { body, contentType } = await optimizeWebImageBytes(bytes);
  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=0, must-revalidate",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}

/**
 * GET /api/vehicle/silhouette/[vehicleId]
 * Same-origin image stream for dashboard headers under COEP.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ vehicleId: string }> },
) {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured || !isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Storage not configured." },
      { status: 503 },
    );
  }

  const { vehicleId: rawId } = await context.params;
  const parsed = vehicleIdSchema.safeParse(rawId);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid vehicle id." },
      { status: 400 },
    );
  }

  const viewer = await getCurrentUser();
  const allowed = await sessionCanAccessVehicleMedia(
    parsed.data,
    viewer?.id ?? null,
  );
  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: "Vehicle photo not found." },
      { status: 404 },
    );
  }

  const bytes = await loadVehicleSilhouetteBytes(parsed.data);
  if (!bytes) {
    return NextResponse.json(
      { ok: false, error: "Vehicle photo not found." },
      { status: 404 },
    );
  }

  return imageResponse(bytes);
}
