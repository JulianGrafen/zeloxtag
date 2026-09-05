import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { optimizeWebImageBytes } from "@/lib/image/optimize-web-image";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { exposeTokenSchema } from "@/lib/vehicles/expose-token";
import { loadVehicleSilhouetteBytes } from "@/lib/vehicles/load-silhouette-bytes";

export const runtime = "nodejs";

async function imageResponse(bytes: Uint8Array): Promise<NextResponse> {
  const { body, contentType } = await optimizeWebImageBytes(bytes);
  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}

/**
 * GET /api/expose/[token]/silhouette
 * Token-gated hero image for sales exposés — never by vehicle id alone.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured || !isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Storage not configured." },
      { status: 503 },
    );
  }

  const { token: rawToken } = await context.params;
  const parsed = exposeTokenSchema.safeParse(rawToken.trim());
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid exposé token." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: vehicle, error } = await admin
    .from("vehicles")
    .select("id")
    .eq("expose_token", parsed.data)
    .eq("is_expose_active", true)
    .maybeSingle();

  if (error || !vehicle?.id) {
    return NextResponse.json(
      { ok: false, error: "Vehicle photo not found." },
      { status: 404 },
    );
  }

  const bytes = await loadVehicleSilhouetteBytes(vehicle.id);
  if (!bytes) {
    return NextResponse.json(
      { ok: false, error: "Vehicle photo not found." },
      { status: 404 },
    );
  }

  return imageResponse(bytes);
}
