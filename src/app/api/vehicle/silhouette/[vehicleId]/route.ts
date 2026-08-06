import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  SILHOUETTE_BUCKET,
  silhouetteObjectPath,
} from "@/lib/vehicles/silhouette-constants";
import {
  isLikelyImageResponse,
  isPngBytes,
} from "@/lib/vehicles/silhouette-bytes";

export const runtime = "nodejs";

const vehicleIdSchema = z.string().uuid();

const SILHOUETTE_IMAGE_HEADERS: Record<string, string> = {
  "Content-Type": "image/png",
  "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
  // Same-origin dashboard <img> under COEP require-corp.
  "Cross-Origin-Resource-Policy": "same-origin",
};

async function fetchRemoteSilhouetteBytes(
  url: string,
): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? "";
    if (!isLikelyImageResponse(contentType, bytes)) return null;
    return bytes;
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

  async function respondWithBytes(bytes: Uint8Array): Promise<NextResponse> {
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: SILHOUETTE_IMAGE_HEADERS,
    });
  }

  const { data, error } = await admin.storage
    .from(SILHOUETTE_BUCKET)
    .download(objectPath);

  if (!error && data) {
    const bytes = new Uint8Array(await data.arrayBuffer());
    if (isPngBytes(bytes)) {
      return respondWithBytes(bytes);
    }
  }

  // Signed URL fallback when download() fails but the object exists.
  const { data: signed, error: signedError } = await admin.storage
    .from(SILHOUETTE_BUCKET)
    .createSignedUrl(objectPath, 120);

  if (!signedError && signed?.signedUrl) {
    const signedBytes = await fetchRemoteSilhouetteBytes(signed.signedUrl);
    if (signedBytes && isPngBytes(signedBytes)) {
      return respondWithBytes(signedBytes);
    }
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
