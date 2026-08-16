import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  imageContentTypeFromBytes,
  isLikelyImageBytes,
  isLikelyImageResponse,
} from "@/lib/vehicles/silhouette-bytes";
import {
  legacySilhouetteObjectPath,
  SILHOUETTE_BUCKET,
  vehiclePhotoObjectPath,
} from "@/lib/vehicles/silhouette-constants";

export const runtime = "nodejs";

const vehicleIdSchema = z.string().uuid();

function isAllowedSilhouetteFetchUrl(url: string, supabaseOrigin: string): boolean {
  try {
    return new URL(url).origin === new URL(supabaseOrigin).origin;
  } catch {
    return false;
  }
}

async function fetchRemoteSilhouetteBytes(
  url: string,
  supabaseOrigin: string,
): Promise<Uint8Array | null> {
  if (!supabaseOrigin || !isAllowedSilhouetteFetchUrl(url, supabaseOrigin)) {
    return null;
  }
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

function imageResponse(bytes: Uint8Array): NextResponse {
  const contentType = imageContentTypeFromBytes(bytes);
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
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

  const { url: supabaseUrl } = getSupabaseEnv();
  let supabaseOrigin = "";
  try {
    supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "";
  } catch {
    supabaseOrigin = "";
  }

  const admin = createAdminClient();
  const objectPaths = [
    vehiclePhotoObjectPath(parsed.data),
    legacySilhouetteObjectPath(parsed.data),
  ];

  for (const objectPath of objectPaths) {
    const { data, error } = await admin.storage
      .from(SILHOUETTE_BUCKET)
      .download(objectPath);

    if (!error && data) {
      const bytes = new Uint8Array(await data.arrayBuffer());
      if (isLikelyImageBytes(bytes)) {
        return imageResponse(bytes);
      }
    }
  }

  for (const objectPath of objectPaths) {
    const { data: signed, error: signedError } = await admin.storage
      .from(SILHOUETTE_BUCKET)
      .createSignedUrl(objectPath, 120);

    if (!signedError && signed?.signedUrl) {
      const signedBytes = await fetchRemoteSilhouetteBytes(
        signed.signedUrl,
        supabaseOrigin,
      );
      if (signedBytes && isLikelyImageBytes(signedBytes)) {
        return imageResponse(signedBytes);
      }
    }
  }

  const { data: vehicle, error: vehicleError } = await admin
    .from("vehicles")
    .select("silhouette_image_url")
    .eq("id", parsed.data)
    .maybeSingle();

  if (vehicleError || !vehicle?.silhouette_image_url) {
    return NextResponse.json(
      { ok: false, error: "Vehicle photo not found." },
      { status: 404 },
    );
  }

  const remoteBytes = await fetchRemoteSilhouetteBytes(
    vehicle.silhouette_image_url,
    supabaseOrigin,
  );
  if (!remoteBytes) {
    return NextResponse.json(
      { ok: false, error: "Vehicle photo not found." },
      { status: 404 },
    );
  }

  return imageResponse(remoteBytes);
}
