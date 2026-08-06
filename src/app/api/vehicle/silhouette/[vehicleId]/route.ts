import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  SILHOUETTE_BUCKET,
  silhouetteObjectPath,
} from "@/lib/vehicles/silhouette-constants";

export const runtime = "nodejs";

const vehicleIdSchema = z.string().uuid();

const SILHOUETTE_IMAGE_HEADERS: Record<string, string> = {
  "Content-Type": "image/png",
  "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
  "Cross-Origin-Resource-Policy": "cross-origin",
  "Access-Control-Allow-Origin": "*",
};

async function fetchRemoteSilhouetteBytes(
  url: string,
): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("image")) return null;
    return new Uint8Array(await response.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * GET /api/vehicle/silhouette/[vehicleId]
 * Same-origin PNG stream for dashboard headers under COEP.
 * Public: silhouettes are part of the digital twin surface.
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

  const admin = createAdminClient();
  const objectPath = silhouetteObjectPath(parsed.data);
  const { data, error } = await admin.storage
    .from(SILHOUETTE_BUCKET)
    .download(objectPath);

  if (!error && data) {
    const bytes = new Uint8Array(await data.arrayBuffer());
    return new NextResponse(bytes, {
      status: 200,
      headers: SILHOUETTE_IMAGE_HEADERS,
    });
  }

  // Fallback: stream the stored public URL (handles bucket propagation delay).
  const { data: vehicle, error: vehicleError } = await admin
    .from("vehicles")
    .select("silhouette_image_url")
    .eq("id", parsed.data)
    .maybeSingle();

  if (vehicleError || !vehicle?.silhouette_image_url) {
    return NextResponse.json(
      { ok: false, error: "Silhouette not found." },
      { status: 404 },
    );
  }

  const remoteBytes = await fetchRemoteSilhouetteBytes(
    vehicle.silhouette_image_url,
  );
  if (!remoteBytes) {
    return NextResponse.json(
      { ok: false, error: "Silhouette not found." },
      { status: 404 },
    );
  }

  return new NextResponse(Buffer.from(remoteBytes), {
    status: 200,
    headers: SILHOUETTE_IMAGE_HEADERS,
  });
}
